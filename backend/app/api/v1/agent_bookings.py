"""Agent API endpoints for booking management"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Booking, User, BookingStatus, Package, BookingRefund
from app.api.deps import get_current_agent
from app.schemas import BookingResponse, BookingWithPackageResponse
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class PaginatedBookingsResponse(BaseModel):
    items: List[BookingWithPackageResponse]
    total: int

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status

@router.get("/bookings", response_model=PaginatedBookingsResponse)
async def list_agent_bookings(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    booking_reference: str = None,
    refund_status: str = None,
    period: str = Query("all", regex="^(today|week|month|ytm|all|custom)$"),
    from_date: str = Query(None),
    to_date: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """List bookings for the current agent's packages"""
    base_stmt = select(Booking).where(Booking.agent_id == current_agent.id)
    
    # Date Filtering Logic
    now = datetime.now(timezone.utc)
    filter_start = None
    filter_end = None

    if period == 'today':
        filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        # Last 7 days
        filter_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        # Last 30 days
        filter_start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'ytm':
        # Year to Month (Start of current year)
        filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'custom' and from_date:
        try:
            filter_start = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            if not filter_start.tzinfo:
                filter_start = filter_start.replace(tzinfo=timezone.utc)
            
            if to_date:
                filter_end = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
                if not filter_end.tzinfo:
                    filter_end = filter_end.replace(tzinfo=timezone.utc)
                filter_end = filter_end + timedelta(days=1)
        except ValueError:
            pass

    if filter_start:
        base_stmt = base_stmt.where(Booking.created_at >= filter_start)
    if filter_end:
        base_stmt = base_stmt.where(Booking.created_at < filter_end)
    
    if status:
        base_stmt = base_stmt.where(Booking.status == BookingStatus(status))
    
    if booking_reference:
        base_stmt = base_stmt.where(Booking.booking_reference.ilike(f"%{booking_reference}%"))
        
    if refund_status:
        base_stmt = base_stmt.join(BookingRefund, Booking.id == BookingRefund.booking_id).where(
            BookingRefund.status == refund_status
        )
        
    # Get total count
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0
    
    # Get paginated items
    stmt = base_stmt.offset(skip).limit(limit).order_by(Booking.created_at.desc()).options(
        selectinload(Booking.package).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability),
            selectinload(Package.dest_metadata)
        ),
        selectinload(Booking.travelers),
        selectinload(Booking.user),
        selectinload(Booking.refund)
    )
    
    result = await db.execute(stmt)
    bookings = result.scalars().all()
    
    return {
        "items": [BookingWithPackageResponse.model_validate(b) for b in bookings],
        "total": total
    }



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
