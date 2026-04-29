"""Agent API endpoints for booking management"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Booking, User, BookingStatus, Package, BookingRefund
from app.api.deps import get_current_agent, check_permission
from app.schemas import BookingResponse, BookingWithPackageResponse
from pydantic import BaseModel
import logging
import traceback

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
    current_agent: User = Depends(check_permission("bookings", "view"))
):
    """List bookings for the current agent's packages"""
    base_stmt = select(Booking).where(Booking.agent_id == current_agent.agent_id)
    
    # Date Filtering Logic
    IST = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(IST)
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
            filter_start = datetime.fromisoformat(from_date.replace('Z', '+05:30'))
            if not filter_start.tzinfo:
                filter_start = filter_start.replace(tzinfo=IST)
            
            if to_date:
                filter_end = datetime.fromisoformat(to_date.replace('Z', '+05:30'))
                if not filter_end.tzinfo:
                    filter_end = filter_end.replace(tzinfo=IST)
                filter_end = filter_end + timedelta(days=1)
        except ValueError:
            pass

    if filter_start:
        base_stmt = base_stmt.where(Booking.created_at >= filter_start)
    if filter_end:
        base_stmt = base_stmt.where(Booking.created_at < filter_end)
    
    if status:
        base_stmt = base_stmt.where(Booking.status == BookingStatus(status.upper()))
    
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
        selectinload(Booking.refund),
        selectinload(Booking.booked_by)
    )
    
    try:
        result = await db.execute(stmt)
        bookings = result.scalars().all()
        
        items = []
        for b in bookings:
            try:
                items.append(BookingWithPackageResponse.model_validate(b))
            except Exception as ve:
                logger.error(f"Validation failed for booking {b.id}: {ve}")
                # Try to identify why
                raise HTTPException(
                    status_code=500,
                    detail=f"Validation failed for booking {b.id}: {str(ve)}"
                )

        return {
            "items": items,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error in list_agent_bookings: {str(e)}")
        import traceback
        traceback_str = traceback.format_exc()
        logger.error(traceback_str)
        # Also print to stdout for uvicorn logs
        print(f"ERROR list_agent_bookings: {str(e)}")
        print(traceback_str)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )



@router.get("/bookings/{booking_id}", response_model=BookingWithPackageResponse)
async def get_agent_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("bookings", "view"))
):
    """Get booking details if owned by agent"""
    stmt = select(Booking).where(
        Booking.id == booking_id,
        Booking.agent_id == current_agent.agent_id
    ).options(
        selectinload(Booking.package).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability),
            selectinload(Package.dest_metadata)
        ),
        selectinload(Booking.travelers),
        selectinload(Booking.user),
        selectinload(Booking.booked_by)
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
    current_agent: User = Depends(check_permission("bookings", "edit"))
):
    """Update booking status"""
    stmt = select(Booking).where(
        Booking.id == booking_id,
        Booking.agent_id == current_agent.agent_id
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    try:
        booking.status = BookingStatus(status.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    await db.commit()
    
    # Invalidate dashboard cache
    try:
        from fastapi_cache import FastAPICache
        await FastAPICache.clear(namespace="dashboard")
    except:
        pass
        
    await db.refresh(booking)
    
    return BookingResponse.model_validate(booking)
