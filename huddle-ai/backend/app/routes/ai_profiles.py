from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from ..core.database import get_db
from ..schemas.ai_profile import AIProfile, AIProfileCreate, AIProfileUpdate
from ..services.auth import get_current_user
from ..services.pdf_service import pdf_service
from ..models.user import User
from ..models.ai_profile import AIProfile as AIProfileModel, Gender

router = APIRouter(prefix="/ai-profiles", tags=["ai-profiles"])

def normalize_gender(gender_value):
    """Normalize gender value to uppercase"""
    if not gender_value:
        return "MALE"
    
    gender_str = str(gender_value).upper().strip()
    
    # Handle various formats
    if gender_str in ['MALE', 'M', 'MAN']:
        return "MALE"
    elif gender_str in ['FEMALE', 'F', 'WOMAN']:
        return "FEMALE"
    else:
        return "MALE"  # Default

@router.post("/", response_model=AIProfile)
async def create_ai_profile(
    profile: AIProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Check for duplicate based on name and user
        existing_profile = db.query(AIProfileModel).filter(
            AIProfileModel.coach_name == profile.coach_name,
            AIProfileModel.created_by == current_user.id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=400, 
                detail=f"AI profile with name '{profile.coach_name}' already exists"
            )
        
        # Normalize gender
        normalized_gender = normalize_gender(profile.gender)

        db_profile = AIProfileModel(
            coach_name=profile.coach_name,
            coach_role=profile.coach_role,
            coach_description=profile.coach_description,
            domain_expertise=profile.domain_expertise,
            gender=normalized_gender,
            user_notes=profile.user_notes,
            created_by=current_user.id
        )
        
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        
        return db_profile
        
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Profile creation failed due to data conflict")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=List[AIProfile])
async def get_my_ai_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        profiles = db.query(AIProfileModel)\
            .filter(AIProfileModel.created_by == current_user.id)\
            .distinct()\
            .order_by(AIProfileModel.created_at.desc())\
            .all()
        
        # Remove any potential duplicates and normalize gender
        seen_ids = set()
        unique_profiles = []
        for profile in profiles:
            if profile.id not in seen_ids:
                # Normalize gender for existing records
                profile.gender = normalize_gender(profile.gender)
                seen_ids.add(profile.id)
                unique_profiles.append(profile)
        
        # Commit gender normalizations
        if unique_profiles:
            db.commit()
        
        return unique_profiles
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")

@router.get("/{profile_id}", response_model=AIProfile)
async def get_ai_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        profile = db.query(AIProfileModel).filter(
            AIProfileModel.id == profile_id,
            AIProfileModel.created_by == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        # Normalize gender
        profile.gender = normalize_gender(profile.gender)
        db.commit()
        
        return profile
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@router.put("/{profile_id}", response_model=AIProfile)
async def update_ai_profile(
    profile_id: int,
    profile_update: AIProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        profile = db.query(AIProfileModel).filter(
            AIProfileModel.id == profile_id,
            AIProfileModel.created_by == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        # Check for name conflicts if name is being updated
        if profile_update.coach_name and profile_update.coach_name != profile.coach_name:
            existing_profile = db.query(AIProfileModel).filter(
                AIProfileModel.coach_name == profile_update.coach_name,
                AIProfileModel.created_by == current_user.id,
                AIProfileModel.id != profile_id
            ).first()
            
            if existing_profile:
                raise HTTPException(
                    status_code=400, 
                    detail=f"AI profile with name '{profile_update.coach_name}' already exists"
                )
        
        # Update fields
        update_data = profile_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field == "gender":
                    value = normalize_gender(value)
                setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

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
    
    try:
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"PDF upload failed: {str(e)}")

@router.delete("/{profile_id}")
async def delete_ai_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        profile = db.query(AIProfileModel).filter(
            AIProfileModel.id == profile_id,
            AIProfileModel.created_by == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="AI Profile not found")
        
        db.delete(profile)
        db.commit()
        return {"message": "AI Profile deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")