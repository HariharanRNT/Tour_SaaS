"""Admin API endpoints for package management"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.models import Package, PackageStatus, ItineraryItem
from app.schemas.packages import (
    PackageCreate,
    PackageUpdate,
    PackageResponse,
    ItineraryItemCreate,
    ItineraryItemUpdate,
    ItineraryItemResponse
)
from sqlalchemy import select, delete

from sqlalchemy.orm import selectinload

router = APIRouter()

# TODO: Add admin authentication dependency
# from app.dependencies import get_current_admin_user


@router.get("/packages", response_model=List[PackageResponse])
async def list_all_packages(
    status_filter: Optional[str] = None,
    destination: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all packages (admin view)"""
    stmt = select(Package).options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items)
    )
    
    if status_filter:
        stmt = stmt.where(Package.status == PackageStatus(status_filter))
    
    if destination:
        stmt = stmt.where(Package.destination.ilike(f"%{destination}%"))
    
    stmt = stmt.offset(skip).limit(limit).order_by(Package.created_at.desc())
    
    result = await db.execute(stmt)
    packages = result.scalars().all()
    
    return packages


@router.post("/packages", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package(
    package_data: PackageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new package"""
    import logging
    import uuid
    import json
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating package: {package_data.dict()}")
        
        # Generate unique slug
        base_slug = package_data.slug or package_data.title.lower().replace(' ', '-')
        unique_slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
        
        # Create package
        new_package = Package(
            title=package_data.title,
            slug=unique_slug,
            destination=package_data.destination,
            duration_days=package_data.duration_days,
            duration_nights=package_data.duration_nights,
            category=package_data.category,
            price_per_person=package_data.price_per_person,
            max_group_size=package_data.max_group_size,
            description=package_data.description,
            status=PackageStatus.DRAFT,
            is_template=False,
            # Flight Configuration
            flights_enabled=package_data.flights_enabled,
            flight_origin_cities=json.dumps(package_data.flight_origin_cities) if package_data.flight_origin_cities else "[]",
            flight_cabin_class=package_data.flight_cabin_class,
            flight_price_included=package_data.flight_price_included,
            flight_baggage_note=package_data.flight_baggage_note
        )
        
        logger.info(f"Package object created: {new_package}")
        
        db.add(new_package)
        logger.info("Package added to session")
        
        await db.commit()
        logger.info("Package committed to database")
        
        # Refresh with relationships populated (empty initially but needed for schema)
        await db.refresh(new_package)
        # Manually load empty relationships to satisfy schema response model
        # Or just re-query. Re-querying is safer.
        stmt = select(Package).where(Package.id == new_package.id).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items)
        )
        result = await db.execute(stmt)
        refreshed_package = result.scalar_one()
        
        logger.info(f"Package refreshed: {refreshed_package.id}")
        
        return refreshed_package
    except Exception as e:
        logger.error(f"Error creating package: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create package: {str(e)}"
        )


@router.get("/packages/{package_id}", response_model=PackageResponse)
async def get_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get package details"""
    stmt = select(Package).where(Package.id == package_id).options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items)
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    return package


@router.put("/packages/{package_id}", response_model=PackageResponse)
async def update_package(
    package_id: UUID,
    package_data: PackageUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update package details"""
    stmt = select(Package).where(Package.id == package_id).options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items)
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Update fields
    import json
    update_data = package_data.dict(exclude_unset=True)
    json_fields = ['included_items', 'excluded_items', 'destinations', 'activities', 'flight_origin_cities']
    
    for field, value in update_data.items():
        if field in json_fields and value is not None:
            setattr(package, field, json.dumps(value))
        else:
            setattr(package, field, value)
    
    await db.commit()
    await db.refresh(package)
    
    return package


@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a package"""
    # Delete trip planning sessions that reference this package
    from sqlalchemy import text
    await db.execute(
        text("DELETE FROM trip_planning_sessions WHERE matched_package_id = :package_id"),
        {"package_id": str(package_id)}
    )
    
    # Delete itinerary items
    stmt = delete(ItineraryItem).where(ItineraryItem.package_id == package_id)
    await db.execute(stmt)
    
    # Delete package
    stmt = delete(Package).where(Package.id == package_id)
    result = await db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    await db.commit()


@router.patch("/packages/{package_id}/status")
async def toggle_package_status(
    package_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db)
):
    """Toggle package publish status"""
    stmt = select(Package).where(Package.id == package_id).options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items)
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    package.status = PackageStatus(new_status)
    await db.commit()
    await db.refresh(package)
    
    return {"status": package.status, "message": f"Package {new_status.lower()}"}


@router.post("/packages/{package_id}/itinerary-items", response_model=ItineraryItemResponse)
async def add_itinerary_item(
    package_id: UUID,
    item_data: ItineraryItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add an activity to package itinerary"""
    import json
    
    new_item = ItineraryItem(
        package_id=package_id,
        day_number=item_data.day_number,
        title=item_data.title,
        description=item_data.description,
        time_slot=item_data.time_slot,
        activities=json.dumps(item_data.activities) if item_data.activities else "[]",
        meals_included=item_data.meals_included,
        display_order=item_data.display_order,
        is_optional=item_data.is_optional or False
    )
    
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    return new_item


@router.put("/packages/{package_id}/itinerary-items/{item_id}", response_model=ItineraryItemResponse)
async def update_itinerary_item(
    package_id: UUID,
    item_id: UUID,
    item_data: ItineraryItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an itinerary item"""
    import json
    
    stmt = select(ItineraryItem).where(
        ItineraryItem.id == item_id,
        ItineraryItem.package_id == package_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary item not found"
        )
    
    # Update fields
    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'activities' and value is not None:
            setattr(item, field, json.dumps(value))
        else:
            setattr(item, field, value)
    
    await db.commit()
    await db.refresh(item)
    
    return item


@router.delete("/packages/{package_id}/itinerary-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary_item(
    package_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete an itinerary item"""
    stmt = delete(ItineraryItem).where(
        ItineraryItem.id == item_id,
        ItineraryItem.package_id == package_id
    )
    result = await db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary item not found"
        )
    
    await db.commit()


@router.patch("/packages/{package_id}/itinerary-items/reorder")
async def reorder_itinerary_items(
    package_id: UUID,
    item_orders: List[dict],  # [{"id": "uuid", "display_order": 0}, ...]
    db: AsyncSession = Depends(get_db)
):
    """Reorder itinerary items"""
    for item_order in item_orders:
        stmt = select(ItineraryItem).where(
            ItineraryItem.id == UUID(item_order['id']),
            ItineraryItem.package_id == package_id
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if item:
            item.display_order = item_order['display_order']
    
    await db.commit()
    
    return {"message": "Items reordered successfully"}
