from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..schemas.meeting import Meeting, MeetingCreate, MeetingUpdate
from ..services.auth import get_current_user
from ..services.meeting_service import meeting_service
from ..models.user import User

router = APIRouter(prefix="/meetings", tags=["meetings"])

@router.post("/", response_model=Meeting)
async def create_meeting(
    meeting: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return meeting_service.create_meeting(db, meeting, current_user.id)

@router.get("/", response_model=List[Meeting])
async def get_my_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return meeting_service.get_user_meetings(db, current_user.id)

@router.get("/{meeting_uuid}", response_model=Meeting)
async def get_meeting(
    meeting_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting

@router.put("/{meeting_uuid}/start")
async def start_meeting(
    meeting_uuid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting_service.start_meeting(db, meeting.id)

@router.put("/{meeting_uuid}/end")
async def end_meeting(
    meeting_uuid: str,
    transcript: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting_service.end_meeting(db, meeting.id, transcript)

@router.put("/{meeting_uuid}", response_model=Meeting)
async def update_meeting(
    meeting_uuid: str,
    meeting_update: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting_service.update_meeting(db, meeting.id, meeting_update)