from sqlalchemy.orm import Session
from sqlalchemy import distinct, and_
from sqlalchemy.exc import IntegrityError
from ..models.meeting import Meeting, MeetingStatus
from ..models.ai_profile import AIProfile
from ..models.chat import ChatHistory
from ..schemas.meeting import MeetingCreate, MeetingUpdate
from ..services.gemini_service import gemini_service
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import hashlib

class MeetingService:
    def create_meeting(self, db: Session, meeting_data: MeetingCreate, user_id: int) -> Meeting:
        try:
            # Generate unique UUID
            meeting_uuid = str(uuid.uuid4())
            
            # Ensure UUID is truly unique
            while db.query(Meeting).filter(Meeting.uuid == meeting_uuid).first():
                meeting_uuid = str(uuid.uuid4())
            
            db_meeting = Meeting(
                uuid=meeting_uuid,
                title=meeting_data.title,
                ai_profile_id=meeting_data.ai_profile_id,
                scheduled_at=meeting_data.scheduled_at,
                created_by=user_id,
                status=MeetingStatus.scheduled
            )
            
            db.add(db_meeting)
            db.commit()
            db.refresh(db_meeting)
            
            print(f"Meeting created successfully: {db_meeting.uuid}")
            return db_meeting
            
        except IntegrityError as e:
            db.rollback()
            print(f"Meeting creation failed due to integrity error: {e}")
            raise
        except Exception as e:
            db.rollback()
            print(f"Meeting creation failed: {e}")
            raise
    
    def get_user_meetings(self, db: Session, user_id: int) -> List[Meeting]:
        try:
            # Get meetings with explicit distinct to prevent duplicates
            meetings = db.query(Meeting)\
                .filter(Meeting.created_by == user_id)\
                .order_by(Meeting.created_at.desc())\
                .all()
            
            # Additional duplicate removal based on UUID
            seen_uuids = set()
            unique_meetings = []
            
            for meeting in meetings:
                if meeting.uuid not in seen_uuids:
                    seen_uuids.add(meeting.uuid)
                    unique_meetings.append(meeting)
            
            print(f"Retrieved {len(unique_meetings)} unique meetings for user {user_id}")
            return unique_meetings
            
        except Exception as e:
            print(f"Failed to get user meetings: {e}")
            return []
    
    def get_meeting_by_uuid(self, db: Session, meeting_uuid: str) -> Optional[Meeting]:
        try:
            return db.query(Meeting).filter(Meeting.uuid == meeting_uuid).first()
        except Exception as e:
            print(f"Failed to get meeting by UUID: {e}")
            return None
    
    def start_meeting(self, db: Session, meeting_id: int) -> Meeting:
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting and meeting.status != MeetingStatus.active:
                meeting.status = MeetingStatus.active
                meeting.started_at = datetime.utcnow()
                db.commit()
                db.refresh(meeting)
                print(f"Meeting {meeting.uuid} started successfully")
            return meeting
        except Exception as e:
            db.rollback()
            print(f"Failed to start meeting: {e}")
            raise
    
    def end_meeting(self, db: Session, meeting_id: int, transcript: str) -> Meeting:
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting and meeting.status != MeetingStatus.completed:
                meeting.status = MeetingStatus.completed
                meeting.ended_at = datetime.utcnow()
                meeting.transcript = transcript
                
                # Generate summary only if transcript exists and isn't empty
                if transcript and transcript.strip():
                    try:
                        ai_profile = db.query(AIProfile).filter(AIProfile.id == meeting.ai_profile_id).first()
                        if ai_profile:
                            summary_data = gemini_service.generate_summary(transcript)
                            meeting.summary = summary_data.get("summary", "")
                            meeting.key_points = summary_data.get("key_points", "")
                            meeting.action_items = summary_data.get("action_items", "")
                    except Exception as summary_error:
                        print(f"Failed to generate meeting summary: {summary_error}")
                        # Continue without summary rather than failing the meeting end
                
                db.commit()
                db.refresh(meeting)
                print(f"Meeting {meeting.uuid} ended successfully")
            return meeting
        except Exception as e:
            db.rollback()
            print(f"Failed to end meeting: {e}")
            raise
    
    def update_meeting(self, db: Session, meeting_id: int, meeting_data: MeetingUpdate) -> Meeting:
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                for field, value in meeting_data.dict(exclude_unset=True).items():
                    if value is not None:
                        setattr(meeting, field, value)
                db.commit()
                db.refresh(meeting)
                print(f"Meeting {meeting.uuid} updated successfully")
            return meeting
        except Exception as e:
            db.rollback()
            print(f"Failed to update meeting: {e}")
            raise
    
    def add_chat_message(self, db: Session, meeting_id: int, message: str, is_user: bool) -> ChatHistory:
        try:
            # Clean the message
            cleaned_message = message.strip()
            if not cleaned_message:
                raise ValueError("Message cannot be empty")
            
            # Create a hash for duplicate detection
            message_hash = hashlib.md5(
                f"{cleaned_message}_{is_user}_{meeting_id}".encode()
            ).hexdigest()
            
            # Check for recent duplicates (within last 10 seconds)
            recent_cutoff = datetime.utcnow() - timedelta(seconds=10)
            existing_message = db.query(ChatHistory).filter(
                and_(
                    ChatHistory.meeting_id == meeting_id,
                    ChatHistory.message == cleaned_message,
                    ChatHistory.is_user == is_user,
                    ChatHistory.created_at >= recent_cutoff
                )
            ).first()
            
            if existing_message:
                print(f"Duplicate message detected, returning existing message: {existing_message.id}")
                return existing_message
            
            # Create new message
            chat_message = ChatHistory(
                meeting_id=meeting_id,
                message=cleaned_message,
                is_user=is_user
            )
            
            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)
            
            print(f"Chat message added successfully: {chat_message.id}")
            return chat_message
            
        except Exception as e:
            db.rollback()
            print(f"Failed to add chat message: {e}")
            raise
    
    def get_chat_history(self, db: Session, meeting_id: int) -> List[ChatHistory]:
        try:
            messages = db.query(ChatHistory)\
                .filter(ChatHistory.meeting_id == meeting_id)\
                .order_by(ChatHistory.created_at)\
                .all()
            
            # Remove duplicates based on content and user type
            seen_combinations = set()
            unique_messages = []
            
            for message in messages:
                # Create unique identifier
                message_key = f"{message.message}_{message.is_user}_{message.meeting_id}"
                message_hash = hashlib.md5(message_key.encode()).hexdigest()
                
                if message_hash not in seen_combinations:
                    seen_combinations.add(message_hash)
                    unique_messages.append(message)
            
            print(f"Retrieved {len(unique_messages)} unique chat messages for meeting {meeting_id}")
            return unique_messages
            
        except Exception as e:
            print(f"Failed to get chat history: {e}")
            return []

meeting_service = MeetingService()