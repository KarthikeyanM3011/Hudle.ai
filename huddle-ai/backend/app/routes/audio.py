from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..services.auth import get_current_user
from ..services.meeting_service import meeting_service
from ..services.deepgram_service import deepgram_service
from ..services.gemini_service import gemini_service
from ..models.user import User
from ..models.ai_profile import AIProfile
from ..models.chat import ChatHistory
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audio", tags=["audio"])

def normalize_gender(gender):
    """Normalize gender value"""
    if not gender:
        return "MALE"
    
    gender_str = str(gender).upper().strip()
    
    # Handle various formats
    if gender_str in ['FEMALE', 'F', 'WOMAN']:
        return "FEMALE"
    else:
        return "MALE"  # Default

import unicodedata

def sanitize_header_value(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

@router.post("/{meeting_uuid}/process")
async def process_audio(
    meeting_uuid: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"Processing audio for meeting: {meeting_uuid}")
    
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
        if not ai_profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        # Read and validate audio data
        audio_data = await audio_file.read()
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file received")
        
        logger.info(f"Received audio file: {len(audio_data)} bytes")
        
        # Step 1: Transcribe audio
        logger.info("Step 1: Transcribing audio...")
        transcript = await deepgram_service.transcribe_audio(audio_data)
        
        if not transcript or not transcript.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio - no speech detected")
        
        transcript = transcript.strip()
        logger.info(f"Transcription successful: '{transcript}'")
        
        # Step 2: Save user message to chat
        logger.info("Step 2: Saving user message...")
        user_message = meeting_service.add_chat_message(db, meeting.id, transcript, True)
        logger.info(f"User message saved with ID: {user_message.id}")
        
        # Step 3: Get chat history for context (excluding the just-added message)
        chat_history = db.query(ChatHistory)\
            .filter(ChatHistory.meeting_id == meeting.id)\
            .filter(ChatHistory.id != user_message.id)\
            .order_by(ChatHistory.created_at.desc())\
            .limit(10)\
            .all()
        
        # Convert to format expected by Gemini service
        history_data = [
            {"message": msg.message, "is_user": msg.is_user} 
            for msg in reversed(chat_history)
        ]
        
        logger.info(f"Step 3: Using {len(history_data)} previous messages for context")
        
        # Step 4: Generate AI response
        logger.info("Step 4: Generating AI response...")
        try:
            ai_response = gemini_service.generate_response(
                user_message=transcript,
                coach_role=ai_profile.coach_role,
                coach_description=ai_profile.coach_description,
                domain_expertise=ai_profile.domain_expertise,
                pdf_content=ai_profile.pdf_content,
                chat_history=history_data
            )
            
            if not ai_response or not ai_response.strip():
                ai_response = "I understand what you're saying. Let me help you with that. Could you provide a bit more detail so I can give you the best guidance?"
            
            ai_response = ai_response.strip()
            logger.info(f"AI response generated: '{ai_response[:100]}...'")
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            ai_response = "I apologize, but I'm having some technical difficulties right now. Let me try to help you with your request."
        
        # Step 5: Save AI response to chat
        logger.info("Step 5: Saving AI response...")
        ai_message = meeting_service.add_chat_message(db, meeting.id, ai_response, False)
        logger.info(f"AI message saved with ID: {ai_message.id}")
        
        # Step 6: Generate speech from AI response
        logger.info("Step 6: Generating speech...")
        normalized_gender = normalize_gender(ai_profile.gender)
        logger.info(f"Using voice for gender: {normalized_gender}")
        
        try:
            audio_response = await deepgram_service.text_to_speech(ai_response, normalized_gender)
            
            if not audio_response or len(audio_response) == 0:
                logger.error("TTS returned empty response")
                raise HTTPException(status_code=500, detail="Could not generate speech response - TTS service failed")
            
            logger.info(f"Generated audio response: {len(audio_response)} bytes")
            
        except Exception as tts_error:
            logger.error(f"TTS generation failed: {tts_error}")
            # Return a fallback response without audio
            raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(tts_error)}")
        
        # Step 7: Return audio with metadata
        logger.info("Step 7: Returning audio response")
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=response.wav",
                "Content-Length": str(len(audio_response)),
                "X-Transcript": sanitize_header_value(transcript),
                "X-AI-Response": "Summa",
                "X-User-Message-ID": str(user_message.id),
                "X-AI-Message-ID": str(ai_message.id),
                "X-Audio-Length": str(len(audio_response)),
                "Access-Control-Expose-Headers": "X-Transcript,X-AI-Response,X-User-Message-ID,X-AI-Message-ID,X-Audio-Length"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio processing error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@router.post("/{meeting_uuid}/transcribe")
async def transcribe_audio_only(
    meeting_uuid: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio without generating AI response"""
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        audio_data = await audio_file.read()
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        transcript = await deepgram_service.transcribe_audio(audio_data)
        
        return {
            "transcript": transcript,
            "success": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/{meeting_uuid}/synthesize")
async def synthesize_speech(
    meeting_uuid: str,
    text: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate speech from text (for testing TTS)"""
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
        if not ai_profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        normalized_gender = normalize_gender(ai_profile.gender)
        logger.info(f"Testing TTS with text: '{text[:50]}...' and gender: {normalized_gender}")
        
        audio_response = await deepgram_service.text_to_speech(text, normalized_gender)
        
        if not audio_response:
            raise HTTPException(status_code=500, detail="Could not generate speech")
        
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=synthesized.wav",
                "Content-Length": str(len(audio_response))
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Speech synthesis test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

@router.get("/{meeting_uuid}/test-tts")
async def test_tts_service(
    meeting_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test TTS service connectivity"""
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Test TTS connection
        tts_working = await deepgram_service.test_tts_connection()
        
        # Get available voices
        voices = deepgram_service.get_available_voices()
        
        return {
            "tts_working": tts_working,
            "available_voices": voices,
            "api_key_present": bool(deepgram_service.api_key),
            "api_key_prefix": deepgram_service.api_key[:10] + "..." if deepgram_service.api_key else "None"
        }
    
    except Exception as e:
        logger.error(f"TTS test failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS test failed: {str(e)}")