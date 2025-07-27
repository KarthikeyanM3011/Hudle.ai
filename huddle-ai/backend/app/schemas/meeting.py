from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..models.meeting import MeetingStatus

class MeetingBase(BaseModel):
    title: str
    ai_profile_id: int
    scheduled_at: Optional[datetime] = None

class MeetingCreate(MeetingBase):
    pass

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[MeetingStatus] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    key_points: Optional[str] = None
    action_items: Optional[str] = None

class Meeting(MeetingBase):
    id: int
    uuid: str
    created_by: int
    status: MeetingStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    key_points: Optional[str] = None
    action_items: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True