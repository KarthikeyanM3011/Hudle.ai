from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base

class MeetingStatus(enum.Enum):
    scheduled = "scheduled"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    ai_profile_id = Column(Integer, ForeignKey("ai_profiles.id"), nullable=False)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.scheduled)
    scheduled_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    transcript = Column(Text)
    summary = Column(Text)
    key_points = Column(Text)
    action_items = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    creator = relationship("User", back_populates="meetings")
    ai_profile = relationship("AIProfile", back_populates="meetings")
    chat_history = relationship("ChatHistory", back_populates="meeting")