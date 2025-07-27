from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base

class Gender(enum.Enum):
    male = "male"
    female = "female"

class AIProfile(Base):
    __tablename__ = "ai_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    coach_name = Column(String(255), nullable=False)
    coach_role = Column(String(255), nullable=False)
    coach_description = Column(Text, nullable=False)
    domain_expertise = Column(String(255), nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    user_notes = Column(Text)
    pdf_content = Column(Text)
    pdf_filename = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    creator = relationship("User", back_populates="ai_profiles")
    meetings = relationship("Meeting", back_populates="ai_profile")