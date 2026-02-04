"""API endpoints for user itinerary management"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.services.user_itinerary_service import UserItineraryService
from app.schemas.templates import (
    UserItineraryCreate, UserItineraryResponse, UserItineraryDetailResponse,
    UserActivityCreate, UserItineraryActivityResponse, ItineraryStatusUpdate
)


router = APIRouter(prefix="/user-itineraries", tags=["User Itineraries"])


@router.post("", response_model=UserItineraryDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_itinerary_from_template(
    itinerary_data: UserItineraryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user itinerary from a template
    Auto-populates with default activities from the template
    """
    service = UserItineraryService(db)
    
    try:
        itinerary = await service.create_from_template(
            user_id=current_user.id,
            destination=itinerary_data.destination,
            num_days=itinerary_data.num_days,
            start_date=itinerary_data.start_date
        )
        
        # Get activities
        activities_dict = await service.get_itinerary_activities(itinerary.id)
        
        # Flatten activities for response
        all_activities = []
        for day_activities in activities_dict.values():
            for slot_activities in day_activities.values():
                all_activities.extend(slot_activities)
        
        # Calculate total cost
        total_cost = await service.calculate_total_cost(itinerary.id)
        
        return {
            **itinerary.__dict__,
            "activities": all_activities,
            "total_cost": total_cost
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[UserItineraryResponse])
async def get_my_itineraries(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all itineraries for the current user"""
    service = UserItineraryService(db)
    itineraries = await service.get_user_itineraries(current_user.id, status=status)
    return itineraries


@router.get("/{itinerary_id}", response_model=UserItineraryDetailResponse)
async def get_itinerary(
    itinerary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific itinerary with all activities"""
    service = UserItineraryService(db)
    
    itinerary = await service.get_user_itinerary(itinerary_id, user_id=current_user.id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    # Get activities
    activities_dict = await service.get_itinerary_activities(itinerary.id)
    
    # Flatten activities
    all_activities = []
    for day_activities in activities_dict.values():
        for slot_activities in day_activities.values():
            all_activities.extend(slot_activities)
    
    # Calculate total cost
    total_cost = await service.calculate_total_cost(itinerary.id)
    
    return {
        **itinerary.__dict__,
        "activities": all_activities,
        "total_cost": total_cost
    }


@router.post("/{itinerary_id}/activities", response_model=UserItineraryActivityResponse, status_code=status.HTTP_201_CREATED)
async def add_custom_activity(
    itinerary_id: UUID,
    activity_data: UserActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a custom activity to the itinerary"""
    service = UserItineraryService(db)
    
    # Verify ownership
    itinerary = await service.get_user_itinerary(itinerary_id, user_id=current_user.id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    try:
        activity = await service.add_custom_activity(
            itinerary_id=itinerary_id,
            day_number=activity_data.day_number,
            time_slot=activity_data.time_slot,
            activity_data=activity_data.activity_data.dict()
        )
        return activity
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{itinerary_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_activity(
    itinerary_id: UUID,
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an activity from the itinerary"""
    service = UserItineraryService(db)
    
    # Verify ownership
    itinerary = await service.get_user_itinerary(itinerary_id, user_id=current_user.id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    success = await service.remove_activity(activity_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    return None


@router.patch("/{itinerary_id}/status", response_model=UserItineraryResponse)
async def update_itinerary_status(
    itinerary_id: UUID,
    status_data: ItineraryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update itinerary status"""
    service = UserItineraryService(db)
    
    # Verify ownership
    itinerary = await service.get_user_itinerary(itinerary_id, user_id=current_user.id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    try:
        updated_itinerary = await service.update_itinerary_status(
            itinerary_id=itinerary_id,
            status=status_data.status
        )
        return updated_itinerary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
