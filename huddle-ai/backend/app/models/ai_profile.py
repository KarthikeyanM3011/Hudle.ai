from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, Union

class AIProfileBase(BaseModel):
    coach_name: str
    coach_role: str
    coach_description: str
    domain_expertise: str
    gender: str
    user_notes: Optional[str] = None
    
    @validator('gender')
    def normalize_gender(cls, v):
        """Normalize gender to uppercase"""
        if not v:
            return "MALE"
        
        gender_str = str(v).upper().strip()
        
        # Handle various formats
        if gender_str in ['MALE', 'M', 'MAN']:
            return "MALE"
        elif gender_str in ['FEMALE', 'F', 'WOMAN']:
            return "FEMALE"
        else:
            return "MALE"  # Default

class AIProfileCreate(AIProfileBase):
    pass

class AIProfileUpdate(BaseModel):
    coach_name: Optional[str] = None
    coach_role: Optional[str] = None
    coach_description: Optional[str] = None
    domain_expertise: Optional[str] = None
    gender: Optional[str] = None
    user_notes: Optional[str] = None
    pdf_content: Optional[str] = None
    pdf_filename: Optional[str] = None
    
    @validator('gender')
    def normalize_gender(cls, v):
        """Normalize gender to uppercase"""
        if v is None:
            return v
            
        gender_str = str(v).upper().strip()
        
        # Handle various formats
        if gender_str in ['MALE', 'M', 'MAN']:
            return "MALE"
        elif gender_str in ['FEMALE', 'F', 'WOMAN']:
            return "FEMALE"
        else:
            return "MALE"  # Default

class AIProfile(AIProfileBase):
    id: int
    created_by: int
    pdf_content: Optional[str] = None
    pdf_filename: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
        
    @validator('gender', pre=True)
    def ensure_uppercase_gender(cls, v):
        """Ensure gender is always uppercase in response"""
        if not v:
            return "MALE"
        return str(v).upper()