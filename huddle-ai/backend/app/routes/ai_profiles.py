from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from .core.database import get_db
from .schemas.ai_profile import AIProfile, AIProfileCreate, AIProfileUpdate
from .services.auth import get_current_user
from .services.pdf_service import pdf_service
from .models.user import User
from .models.ai_profile import AIProfile as AIProfileModel

router = APIRouter(prefix="/ai-profiles", tags=["ai-profiles"])

@router.post("/", response_model=AIProfile)
async def create_ai_profile(
    profile: AIProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_profile = AIProfileModel(
        **profile.dict(),
        created_by=current_user.id
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/", response_model=List[AIProfile])
async def get_my_ai_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AIProfileModel).filter(AIProfileModel.created_by == current_user.id).all()

@router.get("/{profile_id}", response_model=AIProfile)
async def get_ai_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(AIProfileModel).filter(
        AIProfileModel.id == profile_id,
        AIProfileModel.created_by == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="AI Profile not found")
    
    return profile

@router.put("/{profile_id}", response_model=AIProfile)
async def update_ai_profile(
    profile_id: int,
    profile_update: AIProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(AIProfileModel).filter(
        AIProfileModel.id == profile_id,
        AIProfileModel.created_by == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="AI Profile not found")
    
    for field, value in profile_update.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{profile_id}/upload-pdf")
async def upload_pdf_to_profile(
    profile_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(AIProfileModel).filter(
        AIProfileModel.id == profile_id,
        AIProfileModel.created_by == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="AI Profile not found")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_content = await file.read()
    file_path, extracted_text = await pdf_service.save_and_extract_pdf(file_content, file.filename)
    
    if extracted_text:
        profile.pdf_content = extracted_text
        profile.pdf_filename = file.filename
        db.commit()
        db.refresh(profile)
        return {"message": "PDF uploaded and processed successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF")

@router.delete("/{profile_id}")
async def delete_ai_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(AIProfileModel).filter(
        AIProfileModel.id == profile_id,
        AIProfileModel.created_by == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="AI Profile not found")
    
    db.delete(profile)
    db.commit()
    return {"message": "AI Profile deleted successfully"}