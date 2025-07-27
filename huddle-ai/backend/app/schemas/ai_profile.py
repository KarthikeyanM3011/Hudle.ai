from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .models.ai_profile import Gender

class AIProfileBase(BaseModel):
    coach_name: str
    coach_role: str
    coach_description: str
    domain_expertise: str
    gender: Gender
    user_notes: Optional[str] = None

class AIProfileCreate(AIProfileBase):
    pass

class AIProfileUpdate(BaseModel):
    coach_name: Optional[str] = None
    coach_role: Optional[str] = None
    coach_description: Optional[str] = None
    domain_expertise: Optional[str] = None
    gender: Optional[Gender] = None
    user_notes: Optional[str] = None
    pdf_content: Optional[str] = None
    pdf_filename: Optional[str] = None

class AIProfile(AIProfileBase):
    id: int
    created_by: int
    pdf_content: Optional[str] = None
    pdf_filename: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True