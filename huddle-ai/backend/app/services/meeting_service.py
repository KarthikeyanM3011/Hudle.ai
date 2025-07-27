from sqlalchemy.orm import Session
from ..models.meeting import Meeting, MeetingStatus
from ..models.ai_profile import AIProfile
from ..models.chat import ChatHistory
from ..schemas.meeting import MeetingCreate, MeetingUpdate
from ..services.gemini_service import gemini_service
from typing import List, Optional
import uuid
from datetime import datetime

class MeetingService:
    def create_meeting(self, db: Session, meeting_data: MeetingCreate, user_id: int) -> Meeting:
        meeting_uuid = str(uuid.uuid4())
        
        db_meeting = Meeting(
            uuid=meeting_uuid,
            title=meeting_data.title,
            ai_profile_id=meeting_data.ai_profile_id,
            scheduled_at=meeting_data.scheduled_at,
            created_by=user_id,
            status=MeetingStatus.SCHEDULED
        )
        
        db.add(db_meeting)
        db.commit()
        db.refresh(db_meeting)
        return db_meeting
    
    def get_user_meetings(self, db: Session, user_id: int) -> List[Meeting]:
        return db.query(Meeting).filter(Meeting.created_by == user_id).order_by(Meeting.created_at.desc()).all()
    
    def get_meeting_by_uuid(self, db: Session, meeting_uuid: str) -> Optional[Meeting]:
        return db.query(Meeting).filter(Meeting.uuid == meeting_uuid).first()
    
    def start_meeting(self, db: Session, meeting_id: int) -> Meeting:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.ACTIVE
            meeting.started_at = datetime.utcnow()
            db.commit()
            db.refresh(meeting)
        return meeting
    
    def end_meeting(self, db: Session, meeting_id: int, transcript: str) -> Meeting:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.COMPLETED
            meeting.ended_at = datetime.utcnow()
            meeting.transcript = transcript
            
            ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
            if ai_profile and transcript:
                summary_data = gemini_service.generate_summary(transcript)
                meeting.summary = summary_data.get("summary", "")
                meeting.key_points = summary_data.get("key_points", "")
                meeting.action_items = summary_data.get("action_items", "")
            
            db.commit()
            db.refresh(meeting)
        return meeting
    
    def update_meeting(self, db: Session, meeting_id: int, meeting_data: MeetingUpdate) -> Meeting:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            for field, value in meeting_data.dict(exclude_unset=True).items():
                setattr(meeting, field, value)
            db.commit()
            db.refresh(meeting)
        return meeting
    
    def add_chat_message(self, db: Session, meeting_id: int, message: str, is_user: bool) -> ChatHistory:
        chat_message = ChatHistory(
            meeting_id=meeting_id,
            message=message,
            is_user=is_user
        )
        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)
        return chat_message
    
    def get_chat_history(self, db: Session, meeting_id: int) -> List[ChatHistory]:
        return db.query(ChatHistory).filter(ChatHistory.meeting_id == meeting_id).order_by(ChatHistory.created_at).all()

meeting_service = MeetingService()