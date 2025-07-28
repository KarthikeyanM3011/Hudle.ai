from pydantic import BaseModel
from datetime import datetime

class ChatMessageBase(BaseModel):
    message: str
    is_user: bool

class ChatMessageCreate(ChatMessageBase):
    meeting_id: int

class ChatMessage(ChatMessageBase):
    id: int
    meeting_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str    