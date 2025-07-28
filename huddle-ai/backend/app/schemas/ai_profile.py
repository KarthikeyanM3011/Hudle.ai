from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional

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
    
    @validator('coach_name')
    def validate_coach_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Coach name is required')
        return v.strip()
    
    @validator('coach_role')
    def validate_coach_role(cls, v):
        if not v or not v.strip():
            raise ValueError('Coach role is required')
        return v.strip()
    
    @validator('coach_description')
    def validate_coach_description(cls, v):
        if not v or not v.strip():
            raise ValueError('Coach description is required')
        return v.strip()
    
    @validator('domain_expertise')
    def validate_domain_expertise(cls, v):
        if not v or not v.strip():
            raise ValueError('Domain expertise is required')
        return v.strip()

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
    
    @validator('coach_name')
    def validate_coach_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Coach name cannot be empty')
        return v.strip() if v else v
    
    @validator('coach_role')
    def validate_coach_role(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Coach role cannot be empty')
        return v.strip() if v else v
    
    @validator('coach_description')
    def validate_coach_description(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Coach description cannot be empty')
        return v.strip() if v else v
    
    @validator('domain_expertise')
    def validate_domain_expertise(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Domain expertise cannot be empty')
        return v.strip() if v else v

class AIProfile(AIProfileBase):
    id: int
    created_by: int
    pdf_content: Optional[str] = None
    pdf_filename: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True