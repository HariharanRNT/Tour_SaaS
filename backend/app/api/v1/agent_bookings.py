"""Agent API endpoints for booking management"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Booking, User, BookingStatus, Package
from app.api.deps import get_current_agent
from app.schemas import BookingResponse, BookingWithPackageResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/bookings", response_model=List[BookingWithPackageResponse])
async def list_agent_bookings(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    booking_reference: str = None,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """List bookings for the current agent's packages"""
    stmt = select(Booking).where(Booking.agent_id == current_agent.id)
    
    if status:
        stmt = stmt.where(Booking.status == BookingStatus(status))
    
    if booking_reference:
        stmt = stmt.where(Booking.booking_reference.ilike(f"%{booking_reference}%"))
        
    stmt = stmt.offset(skip).limit(limit).order_by(Booking.created_at.desc()).options(
        selectinload(Booking.package).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability),
            selectinload(Package.dest_metadata)
        ),
        selectinload(Booking.travelers),
        selectinload(Booking.user)
    )
    
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    
    return [BookingWithPackageResponse.model_validate(b) for b in bookings]


@router.get("/bookings/{booking_id}", response_model=BookingWithPackageResponse)
async def get_agent_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get booking details if owned by agent"""
    stmt = select(Booking).where(
        Booking.id == booking_id,
        Booking.agent_id == current_agent.id
    ).options(
        selectinload(Booking.package).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability),
            selectinload(Package.dest_metadata)
        ),
        selectinload(Booking.travelers),
        selectinload(Booking.user)
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    return BookingWithPackageResponse.model_validate(booking)


@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Update booking status"""
    stmt = select(Booking).where(
        Booking.id == booking_id,
        Booking.agent_id == current_agent.id
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    try:
        booking.status = BookingStatus(status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    await db.commit()
    await db.refresh(booking)
    
    return BookingResponse.model_validate(booking)
