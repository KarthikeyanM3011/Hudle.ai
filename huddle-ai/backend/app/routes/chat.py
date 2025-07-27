from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..schemas.chat import ChatMessage, ChatRequest
from ..services.auth import get_current_user
from ..services.meeting_service import meeting_service
from ..services.gemini_service import gemini_service
from ..models.user import User
from ..models.ai_profile import AIProfile
from ..models.chat import ChatHistory
from datetime import datetime, timedelta

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/{meeting_uuid}/messages", response_model=List[ChatMessage])
async def get_chat_history(
    meeting_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        messages = meeting_service.get_chat_history(db, meeting.id)
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {str(e)}")

@router.post("/{meeting_uuid}/send")
async def send_chat_message(
    meeting_uuid: str,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
        if not ai_profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        # Clean the user message
        user_message_text = chat_request.message.strip()
        if not user_message_text:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        print(f"Processing chat message: '{user_message_text}' for meeting {meeting_uuid}")
        
        # Add user message to chat history
        user_message = meeting_service.add_chat_message(db, meeting.id, user_message_text, True)
        print(f"User message saved with ID: {user_message.id}")
        
        # Get recent chat history for context (excluding the just-added message to avoid confusion)
        chat_history = db.query(ChatHistory)\
            .filter(ChatHistory.meeting_id == meeting.id)\
            .filter(ChatHistory.id != user_message.id)\
            .order_by(ChatHistory.created_at.desc())\
            .limit(10)\
            .all()
        
        # Reverse to get chronological order
        history_data = [
            {"message": msg.message, "is_user": msg.is_user} 
            for msg in reversed(chat_history)
        ]
        
        print(f"Using {len(history_data)} previous messages for context")
        
        # Generate AI response using Gemini
        try:
            print("Generating AI response...")
            ai_response_text = gemini_service.generate_response(
                user_message=user_message_text,
                coach_role=ai_profile.coach_role,
                coach_description=ai_profile.coach_description,
                domain_expertise=ai_profile.domain_expertise,
                pdf_content=ai_profile.pdf_content,
                chat_history=history_data
            )
            
            if not ai_response_text or not ai_response_text.strip():
                ai_response_text = "I apologize, but I'm having trouble generating a response right now. Could you please rephrase your question?"
            
            print(f"AI response generated: '{ai_response_text[:100]}...'")
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            ai_response_text = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
        
        # Add AI response to chat history
        ai_message = meeting_service.add_chat_message(db, meeting.id, ai_response_text.strip(), False)
        print(f"AI message saved with ID: {ai_message.id}")
        
        # Return both messages for immediate UI update
        return {
            "user_message": {
                "id": user_message.id,
                "message": user_message.message,
                "is_user": user_message.is_user,
                "meeting_id": user_message.meeting_id,
                "created_at": user_message.created_at
            },
            "ai_message": {
                "id": ai_message.id,
                "message": ai_message.message,
                "is_user": ai_message.is_user,
                "meeting_id": ai_message.meeting_id,
                "created_at": ai_message.created_at
            },
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Chat message processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@router.post("/{meeting_uuid}/generate-response")
async def generate_ai_response_only(
    meeting_uuid: str,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI response without saving to chat (for testing)"""
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
        if not ai_profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        # Get recent chat history for context
        chat_history = meeting_service.get_chat_history(db, meeting.id)
        history_data = [
            {"message": msg.message, "is_user": msg.is_user} 
            for msg in chat_history[-10:]
        ]
        
        # Generate AI response
        ai_response = gemini_service.generate_response(
            user_message=chat_request.message,
            coach_role=ai_profile.coach_role,
            coach_description=ai_profile.coach_description,
            domain_expertise=ai_profile.domain_expertise,
            pdf_content=ai_profile.pdf_content,
            chat_history=history_data
        )
        
        return {
            "response": ai_response,
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")