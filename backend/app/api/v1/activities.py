from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update, delete, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Activity, ActivityImage, User, UserRole, Destination, Package, PackageStatus
from app.schemas.activities import (
    ActivityCreate, ActivityResponse, ActivityUpdate, 
    DestinationSummary, PaginatedDestinationResponse,
    DestinationCreate, DestinationUpdate
)
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


@router.get("/destinations", response_model=PaginatedDestinationResponse)
async def get_destinations(
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all unique destinations and their activity counts with pagination.
    """
    # Base cities from activities
    base_cities_stmt = (
        select(Activity.destination_city)
        .where(
            or_(
                Activity.agent_id == None,
                Activity.agent_id == current_user.id
            )
        )
        .group_by(Activity.destination_city)
    )
    
    # Get total count
    count_stmt = select(func.count()).select_from(base_cities_stmt.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0
    
    # Get paginated results with metadata and package counts
    stmt = (
        select(
            Activity.destination_city, 
            func.count(Activity.id).label("activity_count"),
            Destination.country,
            Destination.description,
            Destination.image_url,
            Destination.is_popular,
            Destination.is_active,
            Destination.display_order
        )
        .outerjoin(Destination, Activity.destination_city == Destination.name)
        .where(
            or_(
                Activity.agent_id == None,
                Activity.agent_id == current_user.id
            )
        )
        .group_by(
            Activity.destination_city, 
            Destination.id, # Include ID for uniqueness if name is not enough
            Destination.country, 
            Destination.description, 
            Destination.image_url, 
            Destination.is_popular, 
            Destination.is_active, 
            Destination.display_order
        )
        .order_by(Activity.destination_city)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Get package counts for these cities
    cities = [row.destination_city for row in rows]
    pkg_count_stmt = (
        select(Package.destination, func.count(Package.id).label("pkg_count"))
        .where(Package.destination.in_(cities))
        .group_by(Package.destination)
    )
    pkg_result = await db.execute(pkg_count_stmt)
    pkg_counts = {row.destination: row.pkg_count for row in pkg_result.all()}
    
    destinations = []
    for row in rows:
        destinations.append(DestinationSummary(
            name=row.destination_city, # Mapping city to name
            country=row.country or "",
            description=row.description,
            image_url=row.image_url,
            is_popular=row.is_popular if row.is_popular is not None else True,
            is_active=row.is_active if row.is_active is not None else True,
            display_order=row.display_order or 999,
            activity_count=row.activity_count,
            package_count=pkg_counts.get(row.destination_city, 0)
        ))
    
    return PaginatedDestinationResponse(
        destinations=destinations,
        total_count=total_count,
        page=page,
        limit=limit
    )


@router.post("/destinations/metadata", response_model=DestinationSummary)
async def update_destination_metadata(
    metadata: DestinationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create or update destination metadata (image, description, etc.)
    """
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.AGENT:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if exists
    stmt = select(Destination).where(Destination.name == metadata.name)
    result = await db.execute(stmt)
    db_dest = result.scalar_one_or_none()
    
    if db_dest:
        # Update
        for key, value in metadata.model_dump().items():
            setattr(db_dest, key, value)
        
        await db.commit()
        await db.refresh(db_dest)
        
        # Get counts for return
        act_count_stmt = select(func.count()).where(Activity.destination_city == db_dest.name)
        act_count_res = await db.execute(act_count_stmt)
        act_count = act_count_res.scalar() or 0
        
        pkg_count_stmt = select(func.count()).where(Package.destination == db_dest.name)
        pkg_count_res = await db.execute(pkg_count_stmt)
        pkg_count = pkg_count_res.scalar() or 0
        
        return DestinationSummary(
            name=db_dest.name,
            country=db_dest.country,
            description=db_dest.description,
            image_url=db_dest.image_url,
            is_popular=db_dest.is_popular,
            is_active=db_dest.is_active,
            display_order=db_dest.display_order,
            activity_count=act_count,
            package_count=pkg_count
        )
    else:
        # Create
        db_dest = Destination(**metadata.model_dump())
        db.add(db_dest)
    
    await db.commit()
    await db.refresh(db_dest)
    
    # Get counts for return
    act_count_stmt = select(func.count()).where(Activity.destination_city == db_dest.name)
    act_count_res = await db.execute(act_count_stmt)
    act_count = act_count_res.scalar() or 0
    
    pkg_count_stmt = select(func.count()).where(Package.destination == db_dest.name)
    pkg_count_res = await db.execute(pkg_count_stmt)
    pkg_count = pkg_count_res.scalar() or 0
    
    return DestinationSummary(
        name=db_dest.name,
        country=db_dest.country,
        description=db_dest.description,
        image_url=db_dest.image_url,
        is_popular=db_dest.is_popular,
        is_active=db_dest.is_active,
        display_order=db_dest.display_order,
        activity_count=act_count,
        package_count=pkg_count
    )


@router.put("/destination/{old_name}", response_model=DestinationSummary)
async def update_destination(
    old_name: str,
    metadata: DestinationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update destination metadata and handle renaming across the system.
    """
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.AGENT:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if exists
    stmt = select(Destination).where(Destination.name == old_name)
    result = await db.execute(stmt)
    db_dest = result.scalar_one_or_none()
    
    if not db_dest:
        # Check if the city exists in activities or packages
        # If it doesn't exist anywhere, then it's a 404
        act_stmt = select(Activity).where(Activity.destination_city == old_name).limit(1)
        pkg_stmt = select(Package.id).where(Package.destination == old_name).limit(1)
        
        act_res = await db.execute(act_stmt)
        pkg_res = await db.execute(pkg_stmt)
        
        if not act_res.scalar_one_or_none() and not pkg_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Destination '{old_name}' not found in activities or metadata")
            
        # Create the metadata record
        db_dest = Destination(name=old_name, country=metadata.country or "Unknown")
        db.add(db_dest)

    new_name = metadata.name
    
    # If name is being changed, we need to update references
    if new_name and new_name != old_name:
        # Check if new name already exists elsewhere
        check_stmt = select(Destination).where(Destination.name == new_name)
        check_result = await db.execute(check_stmt)
        if check_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Destination '{new_name}' already exists")

        # Update activities
        act_update_stmt = update(Activity).where(Activity.destination_city == old_name).values(destination_city=new_name)
        await db.execute(act_update_stmt)

        # Update packages
        pkg_update_stmt = update(Package).where(Package.destination == old_name).values(destination=new_name)
        await db.execute(pkg_update_stmt)

    # Update Destination metadata
    update_data = metadata.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_dest, key, value)
    
    await db.commit()
    await db.refresh(db_dest)
    
    # Get counts for return
    act_count_stmt = select(func.count()).where(Activity.destination_city == db_dest.name)
    act_count_res = await db.execute(act_count_stmt)
    act_count = act_count_res.scalar() or 0
    
    pkg_count_stmt = select(func.count()).where(Package.destination == db_dest.name)
    pkg_count_res = await db.execute(pkg_count_stmt)
    pkg_count = pkg_count_res.scalar() or 0
    
    return DestinationSummary(
        name=db_dest.name,
        country=db_dest.country,
        description=db_dest.description,
        image_url=db_dest.image_url,
        is_popular=db_dest.is_popular,
        is_active=db_dest.is_active,
        display_order=db_dest.display_order,
        activity_count=act_count,
        package_count=pkg_count
    )


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
