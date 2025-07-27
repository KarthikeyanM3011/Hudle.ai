from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from ..core.database import get_db
from ..schemas.meeting import Meeting, MeetingCreate, MeetingUpdate
from ..services.auth import get_current_user
from ..services.meeting_service import meeting_service
from ..models.user import User
from ..models.meeting import Meeting as MeetingModel
import uuid as uuid_lib
from datetime import datetime, timedelta

router = APIRouter(prefix="/meetings", tags=["meetings"])

@router.post("/", response_model=Meeting)
async def create_meeting(
    meeting: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Check for recent duplicate meetings (within last 5 minutes)
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
        existing_meeting = db.query(MeetingModel).filter(
            MeetingModel.title == meeting.title,
            MeetingModel.created_by == current_user.id,
            MeetingModel.ai_profile_id == meeting.ai_profile_id,
            MeetingModel.created_at >= recent_cutoff
        ).first()
        
        if existing_meeting:
            # Return the existing meeting instead of creating a duplicate
            return existing_meeting
        
        # Create new meeting with unique UUID
        new_meeting = meeting_service.create_meeting(db, meeting, current_user.id)
        return new_meeting
        
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Meeting creation failed due to data conflict")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")

@router.get("/", response_model=List[Meeting])
async def get_my_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meetings = meeting_service.get_user_meetings(db, current_user.id)
        
        # Remove duplicates based on UUID (most reliable unique identifier)
        seen_uuids = set()
        unique_meetings = []
        for meeting in meetings:
            if meeting.uuid not in seen_uuids:
                seen_uuids.add(meeting.uuid)
                unique_meetings.append(meeting)
        
        return unique_meetings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(e)}")

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
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if meeting is already started
        if meeting.status == "active":
            return {"message": "Meeting already started", "meeting": meeting}
        
        updated_meeting = meeting_service.start_meeting(db, meeting.id)
        return {"message": "Meeting started successfully", "meeting": updated_meeting}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start meeting: {str(e)}")

@router.put("/{meeting_uuid}/end")
async def end_meeting(
    meeting_uuid: str,
    transcript: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if meeting is already ended
        if meeting.status == "completed":
            return {"message": "Meeting already ended", "meeting": meeting}
        
        updated_meeting = meeting_service.end_meeting(db, meeting.id, transcript)
        return {"message": "Meeting ended successfully", "meeting": updated_meeting}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end meeting: {str(e)}")

@router.put("/{meeting_uuid}", response_model=Meeting)
async def update_meeting(
    meeting_uuid: str,
    meeting_update: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meeting = meeting_service.get_meeting_by_uuid(db, meeting_uuid)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        updated_meeting = meeting_service.update_meeting(db, meeting.id, meeting_update)
        return updated_meeting
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update meeting: {str(e)}")