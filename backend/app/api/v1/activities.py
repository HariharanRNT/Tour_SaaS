from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update, delete, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Activity, ActivityImage, User, UserRole
from app.schemas.activities import ActivityCreate, ActivityResponse, ActivityUpdate, DestinationSummary
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[ActivityResponse])
async def get_activities(
    city: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all activities. 
    Agents can see platform activities (agent_id=None) and their own activities.
    """
    stmt = select(Activity).options(selectinload(Activity.images)).where(
        or_(
            Activity.agent_id == None,
            Activity.agent_id == current_user.id
        )
    )
    
    if city:
        # Case insensitive city search
        stmt = stmt.where(Activity.destination_city.ilike(f"%{city}%"))
    if category:
        stmt = stmt.where(Activity.category.ilike(f"%{category}%"))
        
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=ActivityResponse)
async def create_activity(
    activity_in: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new activity.
    If the user is an admin, they can potentially create platform activities, but for now we default to setting agent_id unless specified.
    """
    activity_data = activity_in.model_dump(exclude={"images"})
    db_activity = Activity(
        **activity_data,
        agent_id=current_user.id if current_user.role != UserRole.ADMIN else None
    )
    db.add(db_activity)
    await db.flush() # Get activity ID
    
    if activity_in.images:
        for img in activity_in.images:
            db_img = ActivityImage(
                **img.model_dump(),
                activity_id=db_activity.id
            )
            db.add(db_img)
            
    await db.commit()
    
    # Reload with images
    stmt = select(Activity).options(selectinload(Activity.images)).where(Activity.id == db_activity.id)
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/destinations", response_model=List[DestinationSummary])
async def get_destinations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all unique destinations and their activity counts.
    """
    stmt = (
        select(Activity.destination_city, func.count(Activity.id).label("activity_count"))
        .where(
            or_(
                Activity.agent_id == None,
                Activity.agent_id == current_user.id
            )
        )
        .group_by(Activity.destination_city)
        .order_by(Activity.destination_city)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [DestinationSummary(city=row.destination_city, activity_count=row.activity_count) for row in rows]


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Activity).where(Activity.id == activity_id)
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()
    
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        
    if activity.agent_id and activity.agent_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this activity")
        
    return activity


@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    activity_in: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Activity).options(selectinload(Activity.images)).where(Activity.id == activity_id)
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()
    
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        
    if activity.agent_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this activity")
        
    update_data = activity_in.model_dump(exclude_unset=True, exclude={"images"})
    for field, value in update_data.items():
        setattr(activity, field, value)
    
    if activity_in.images is not None:
        # Simple approach: delete existing and recreates
        # In a more advanced impl, we would diff
        delete_stmt = delete(ActivityImage).where(ActivityImage.activity_id == activity.id)
        await db.execute(delete_stmt)
        
        for img in activity_in.images:
            db_img = ActivityImage(
                **img.model_dump(),
                activity_id=activity.id
            )
            db.add(db_img)
        
    await db.commit()
    
    # Reload
    stmt = select(Activity).options(selectinload(Activity.images)).where(Activity.id == activity.id)
    result = await db.execute(stmt)
    return result.scalar_one()


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(Activity).where(Activity.id == activity_id)
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()
    
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        
    if activity.agent_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this activity")
        
    await db.delete(activity)
    await db.commit()
    return {"message": "Activity deleted successfully"}


@router.delete("/destination/{city}")
async def delete_destination_activities(
    city: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete all activities for a specific destination city owned by the current user."""
    stmt = delete(Activity).where(
        Activity.destination_city == city,
        Activity.agent_id == current_user.id
    )
    
    # Special handling for Admin if needed
    if current_user.role == UserRole.ADMIN:
        stmt = delete(Activity).where(Activity.destination_city == city)
        
    result = await db.execute(stmt)
    await db.commit()
    
    return {"message": f"Deleted activities for {city}"}
