"""API endpoints for template management (Admin)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user
from app.models import User, UserRole, Package
from app.services.template_service import TemplateService
from app.schemas.templates import (
    TemplateCreate, TemplateResponse, TemplateDetailResponse,
    TemplateActivityCreate, TemplateActivityResponse, TemplateActivityUpdate
)


router = APIRouter(prefix="/admin/templates", tags=["Admin - Templates"])


async def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new package template"""
    service = TemplateService(db)
    
    try:
        template = await service.create_template(
            title=template_data.title,
            destination=template_data.destination,
            max_days=template_data.max_days,
            description=template_data.description,
            created_by=current_user.id
        )
        return template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all templates"""
    service = TemplateService(db)
    templates = await service.get_all_templates()
    return templates


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get template details with all activities"""
    service = TemplateService(db)
    
    stmt = select(Package).where(
        Package.id == template_id,
        Package.is_template == True
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Get activities
    activities = await service.get_template_activities(template_id)
    
    return {
        **template.__dict__,
        "activities": activities
    }


@router.post("/{template_id}/activities", response_model=TemplateActivityResponse, status_code=status.HTTP_201_CREATED)
async def add_activity_to_template(
    template_id: UUID,
    activity_data: TemplateActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Add an activity to a template day"""
    service = TemplateService(db)
    
    try:
        activity = await service.add_activity_to_template(
            template_id=template_id,
            day_number=activity_data.day_number,
            time_slot=activity_data.time_slot,
            title=activity_data.title,
            description=activity_data.description,
            activities=activity_data.activities,
            display_order=activity_data.display_order
        )
        return activity
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/activities/{activity_id}", response_model=TemplateActivityResponse)
async def update_template_activity(
    activity_id: UUID,
    activity_data: TemplateActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a template activity"""
    service = TemplateService(db)
    
    try:
        # Filter out None values
        update_data = {k: v for k, v in activity_data.dict().items() if v is not None}
        activity = await service.update_template_activity(activity_id, **update_data)
        return activity
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a template activity"""
    service = TemplateService(db)
    
    success = await service.delete_template_activity(activity_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    return None
