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
import io

router = APIRouter(prefix="/audio", tags=["audio"])

@router.post("/{meeting_uuid}/process")
async def process_audio(
    meeting_uuid: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
    if not ai_profile:
        raise HTTPException(status_code=404, detail="AI Profile not found")
    
    try:
        audio_data = await audio_file.read()
        
        transcript = await deepgram_service.transcribe_audio(audio_data)
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        meeting_service.add_chat_message(db, meeting.id, transcript, True)
        
        chat_history = meeting_service.get_chat_history(db, meeting.id)
        history_data = [{"message": msg.message, "is_user": msg.is_user} for msg in chat_history[-10:]]
        
        ai_response = gemini_service.generate_response(
            user_message=transcript,
            coach_role=ai_profile.coach_role,
            coach_description=ai_profile.coach_description,
            domain_expertise=ai_profile.domain_expertise,
            pdf_content=ai_profile.pdf_content,
            chat_history=history_data
        )
        
        meeting_service.add_chat_message(db, meeting.id, ai_response, False)
        
        audio_response = await deepgram_service.text_to_speech(ai_response, ai_profile.gender)
        if not audio_response:
            raise HTTPException(status_code=500, detail="Could not generate speech")
        
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=response.wav",
                "X-Transcript": transcript,
                "X-AI-Response": ai_response
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@router.post("/{meeting_uuid}/transcribe")
async def transcribe_audio_only(
    meeting_uuid: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        audio_data = await audio_file.read()
        transcript = await deepgram_service.transcribe_audio(audio_data)
        
        return {"transcript": transcript}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")