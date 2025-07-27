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

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/{meeting_uuid}/messages", response_model=List[ChatMessage])
async def get_chat_history(
    meeting_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting_service.get_chat_history(db, meeting.id)

@router.post("/{meeting_uuid}/send", response_model=ChatMessage)
async def send_chat_message(
    meeting_uuid: str,
    chat_request: ChatRequest,
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
    
    meeting_service.add_chat_message(db, meeting.id, chat_request.message, True)
    
    chat_history = meeting_service.get_chat_history(db, meeting.id)
    history_data = [{"message": msg.message, "is_user": msg.is_user} for msg in chat_history[-10:]]
    
    ai_response = gemini_service.generate_response(
        user_message=chat_request.message,
        coach_role=ai_profile.coach_role,
        coach_description=ai_profile.coach_description,
        domain_expertise=ai_profile.domain_expertise,
        pdf_content=ai_profile.pdf_content,
        chat_history=history_data
    )
    
    return meeting_service.add_chat_message(db, meeting.id, ai_response, False)