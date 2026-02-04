"""API endpoints for bookings with customizations"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.services.booking_service import BookingService
from app.schemas.package_schemas import (
    BookingWithCustomizationsCreate,
    BookingWithCustomizationsResponse
)


router = APIRouter(prefix="/bookings-custom", tags=["Bookings - With Customizations"])


@router.post("", response_model=BookingWithCustomizationsResponse)
async def create_booking_with_customizations(
    booking_data: BookingWithCustomizationsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a booking with optional itinerary customizations
    Allows users to remove default activities or add custom ones
    """
    service = BookingService(db)
    
    try:
        # Convert customizations to dict format
        customizations = [c.dict() for c in booking_data.customizations] if booking_data.customizations else []
        
        booking = await service.create_booking_with_customizations(
            package_id=booking_data.package_id,
            user_id=current_user.id,
            travel_date=booking_data.travel_date,
            number_of_travelers=booking_data.number_of_travelers,
            customizations=customizations
        )
        
        # Get full booking with customizations
        result = await service.get_booking_with_customizations(booking.id)
        
        return {
            'booking_id': booking.id,
            'package_id': booking.package_id,
            'travel_date': booking.travel_date,
            'number_of_travelers': booking.number_of_travelers,
            'total_amount': booking.total_amount,
            'customizations': result['customizations'],
            'final_itinerary': result['final_itinerary']
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{booking_id}", response_model=BookingWithCustomizationsResponse)
async def get_booking_with_customizations(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get booking with all customizations and final itinerary"""
    service = BookingService(db)
    
    try:
        result = await service.get_booking_with_customizations(booking_id)
        booking = result['booking']
        
        # Verify ownership
        if booking.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this booking"
            )
        
        return {
            'booking_id': booking.id,
            'package_id': booking.package_id,
            'travel_date': booking.travel_date,
            'number_of_travelers': booking.number_of_travelers,
            'total_amount': booking.total_amount,
            'customizations': result['customizations'],
            'final_itinerary': result['final_itinerary']
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
