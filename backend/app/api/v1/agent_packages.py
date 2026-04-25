"""Agent API endpoints for package management"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.models import Package, PackageStatus, ItineraryItem, User
from app.schemas.packages import (
    PackageCreate,
    PackageUpdate,
    PackageResponse,
    ItineraryItemCreate,
    ItineraryItemUpdate,
    ItineraryItemResponse,
    PaginatedPackageResponse
)
from app.schemas.packages import PackageImageResponse
from app.api.deps import get_current_agent, check_permission
from app.services.cancellation_service import validate_and_sort_rules
from sqlalchemy import select, delete
from fastapi import File, UploadFile
import json
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache
from app.tasks.pdf_tasks import generate_package_pdf_task

router = APIRouter()


def _persist_cancellation_rules(enabled: bool, rules: list) -> list:
    """
    Validate and normalise cancellation rules before persisting to the DB.
    Raises HTTP 400 on invalid input.
    Returns an empty list when cancellation is disabled.
    """
    if not enabled:
        return []
    try:
        return validate_and_sort_rules(rules)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def _validate_inclusions(inclusions: dict) -> dict:
    """Validate and trim inclusions details"""
    keys = [
        'flights', 'transportation', 'hotel', 'visaAssistance',
        'travelInsurance', 'tourGuide', 'foodAndDining', 'supportAndServices', 'languages'
    ]
    for key in keys:
        if key in inclusions:
            item = inclusions[key]
            if not item.get('included'):
                item['details'] = None
            if item.get('details'):
                item['details'] = str(item['details']).strip()[:200]
    return inclusions


@router.get("/packages", response_model=PaginatedPackageResponse)
async def list_agent_packages(
    status_filter: Optional[str] = None,
    destination: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """List packages owned by current agent with pagination"""
    # Calculate skip
    skip = (page - 1) * limit
    
    # Base query
    stmt = select(Package).where(Package.created_by == current_agent.agent_id)
    
    if status_filter and status_filter != 'all':
        try:
            stmt = stmt.where(Package.status == PackageStatus(status_filter.upper()))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status filter: '{status_filter}'. Valid values are: draft, published, archived")
    
    if destination and destination != 'all':
        from sqlalchemy import or_
        stmt = stmt.where(
            or_(
                Package.destination.ilike(f"%{destination}%"),
                Package.title.ilike(f"%{destination}%")
            )
        )
        
    # Get total count first
    from sqlalchemy import func
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # Apply sorting
    if sort_order == "desc":
        order_column = getattr(Package, sort_by).desc()
    else:
        order_column = getattr(Package, sort_by).asc()
        
    # Eager load relationships for list view too, or maybe just images
    from sqlalchemy.orm import selectinload
    stmt = stmt.options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items),
        selectinload(Package.availability),
        selectinload(Package.trip_styles),
        selectinload(Package.activity_tags)
    ).order_by(order_column).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    packages = result.scalars().all()
    
    return PaginatedPackageResponse(
        items=packages,
        total=total,
        page=page,
        limit=limit
    )


@router.post("/packages", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_agent_package(
    package_data: PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Create a new package for the agent"""
    import logging
    import uuid
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating package for agent {current_agent.agent_id}: {package_data.dict()}")
        
        # Generate unique slug (and ID manually to allow re-fetching safely)
        package_id = uuid.uuid4()
        from app.services.package_service import PackageService
        
        # Use provided slug as base if available, otherwise use title
        slug_base = package_data.slug if package_data.slug else package_data.title
        unique_slug = PackageService.generate_slug(slug_base, package_id)
        
        # Determine effective GST values — null them out if GST is not applicable
        gst_applicable = package_data.gst_applicable  # True / False / None
        gst_percentage = package_data.gst_percentage if gst_applicable else None
        gst_mode = package_data.gst_mode if gst_applicable else None

        # Serialize trip_styles list → JSON string for the trip_style DB column (backward compatibility)
        import json as _json
        from app.models import TripStyle, ActivityTag
        trip_styles_list = package_data.trip_style_ids or []
        trip_style_names = []
        if trip_styles_list:
            style_stmt = select(TripStyle.name).where(TripStyle.id.in_(trip_styles_list))
            style_res = await db.execute(style_stmt)
            trip_style_names = [r[0] for r in style_res.all()]
            
        trip_style_serialized = _json.dumps(trip_style_names) if trip_style_names else None
        
        # Similar for activity tags legacy column
        activity_tag_ids = package_data.activity_tag_ids or []
        activity_names = []
        if activity_tag_ids:
            tag_stmt = select(ActivityTag.name).where(ActivityTag.id.in_(activity_tag_ids))
            tag_res = await db.execute(tag_stmt)
            activity_names = [r[0] for r in tag_res.all()]
        
        activities_serialized = _json.dumps(activity_names) if activity_names else "[]"

        # Create package
        new_package = Package(
            id=package_id,
            title=package_data.title,
            slug=unique_slug,
            destination=package_data.destination.strip() if package_data.destination else "",
            duration_days=package_data.duration_days,
            duration_nights=package_data.duration_nights,
            trip_style=trip_style_serialized,
            price_per_person=package_data.price_per_person,
            max_group_size=package_data.max_group_size,
            description=package_data.description,
            included_items=json.dumps(package_data.included_items) if package_data.included_items else "[]",
            excluded_items=json.dumps(package_data.excluded_items) if package_data.excluded_items else "[]",
            country=package_data.country,
            is_public=package_data.is_public,
            status=PackageStatus.DRAFT,
            is_template=False,
            created_by=current_agent.agent_id,  # Assign to the parent agent/agency
            feature_image_url=package_data.feature_image_url,
            package_mode=package_data.package_mode,
            destinations=json.dumps(package_data.destinations) if package_data.destinations else "[]",
            activities=activities_serialized,
            # GST Configuration
            gst_applicable=gst_applicable,
            gst_percentage=gst_percentage,
            gst_mode=gst_mode,
            # Flight Configuration
            flights_enabled=package_data.flights_enabled,
            flight_origin_cities=json.dumps(package_data.flight_origin_cities) if package_data.flight_origin_cities else "[]",
            flight_cabin_class=package_data.flight_cabin_class,
            flight_price_included=package_data.flight_price_included,
            flight_baggage_note=package_data.flight_baggage_note,
            # Cancellation Policy (validate + sort rules before storing)
            cancellation_enabled=package_data.cancellation_enabled,
            cancellation_rules=_persist_cancellation_rules(
                package_data.cancellation_enabled,
                [r.dict() if hasattr(r, 'dict') else r for r in (package_data.cancellation_rules or [])]
            ),
            # Dual Booking
            booking_type=package_data.booking_type,
            price_label=package_data.price_label,
            enquiry_payment=package_data.enquiry_payment,
            # Inclusions & Exclusions
            inclusions=_validate_inclusions(package_data.inclusions) if package_data.inclusions else {},
            exclusions=package_data.exclusions or {},
            custom_services=[s.dict() if hasattr(s, 'dict') else s for s in package_data.custom_services] if package_data.custom_services else []
        )
        
        db.add(new_package)
        
        # Add Trip Style relationships
        if package_data.trip_style_ids:
            from app.models import PackageTripStyle
            for style_id in package_data.trip_style_ids:
                db.add(PackageTripStyle(package_id=package_id, trip_style_id=style_id))
        
        # Add Activity Tag relationships
        if package_data.activity_tag_ids:
            from app.models import PackageActivityTag
            for tag_id in package_data.activity_tag_ids:
                db.add(PackageActivityTag(package_id=package_id, activity_tag_id=tag_id))
        
        await db.commit()
        
        # Invalidate cache
        await FastAPICache.clear(namespace="packages")
        await FastAPICache.clear(namespace="dashboard")
        
        # Pre-generate PDF in background
        generate_package_pdf_task.delay(str(package_id))
        # No refresh needed, we know the ID and we want to load relations safely
        
        # Re-fetch with relationships to ensure valid response model
        from sqlalchemy.orm import selectinload
        stmt = select(Package).options(
            selectinload(Package.itinerary_items),
            selectinload(Package.images),
            selectinload(Package.availability),
            selectinload(Package.trip_styles),
            selectinload(Package.activity_tags)
        ).where(Package.id == package_id)
        
        result = await db.execute(stmt)
        created_package = result.scalar_one()
        
        return created_package
    except Exception as e:
        logger.error(f"Error creating package: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create package: {str(e)}"
        )


@router.get("/packages/{package_id}", response_model=PackageResponse)
@cache(expire=300, namespace="packages")
async def get_agent_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get package details if owned by agent"""
    from sqlalchemy.orm import selectinload
    stmt = select(Package).options(
        selectinload(Package.itinerary_items),
        selectinload(Package.images),
        selectinload(Package.availability),
        selectinload(Package.trip_styles),
        selectinload(Package.activity_tags)
    ).where(
        Package.id == package_id,
        Package.created_by == current_agent.agent_id
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
async def update_agent_package(
    package_id: UUID,
    package_data: PackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Update package details if owned by agent"""
    stmt = select(Package).where(
        Package.id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Update fields
    update_data = package_data.dict(exclude_unset=True)
    if "destination" in update_data and update_data["destination"]:
        update_data["destination"] = update_data["destination"].strip()
    json_fields = ['included_items', 'excluded_items', 'destinations', 'activities', 'flight_origin_cities']

    # Handle trip_style_ids → serialize names as JSON into the trip_style String column AND update association table
    import json as _json
    from app.models import TripStyle, ActivityTag
    if 'trip_style_ids' in update_data:
        trip_style_ids = update_data.pop('trip_style_ids') or []
        
        # Fetch names for legacy column
        trip_style_names = []
        if trip_style_ids:
            style_stmt = select(TripStyle.name).where(TripStyle.id.in_(trip_style_ids))
            style_res = await db.execute(style_stmt)
            trip_style_names = [r[0] for r in style_res.all()]
        
        # Update legacy column
        package.trip_style = _json.dumps(trip_style_names) if trip_style_names else None
        
        # Sync association table
        from app.models import PackageTripStyle
        # Delete old
        await db.execute(delete(PackageTripStyle).where(PackageTripStyle.package_id == package_id))
        # Add new
        for sid in trip_style_ids:
            db.add(PackageTripStyle(package_id=package_id, trip_style_id=sid))
            
    elif 'trip_style' in update_data:
        # Legacy single-value update
        raw = update_data.pop('trip_style')
        package.trip_style = _json.dumps([raw]) if raw else None

    # Handle activity_tag_ids sync
    if 'activity_tag_ids' in update_data:
        activity_tag_ids = update_data.pop('activity_tag_ids') or []
        
        # Fetch names for legacy column
        activity_names = []
        if activity_tag_ids:
            tag_stmt = select(ActivityTag.name).where(ActivityTag.id.in_(activity_tag_ids))
            tag_res = await db.execute(tag_stmt)
            activity_names = [r[0] for r in tag_res.all()]
        
        # Update legacy column
        package.activities = _json.dumps(activity_names)
        
        from app.models import PackageActivityTag
        # Delete old
        await db.execute(delete(PackageActivityTag).where(PackageActivityTag.package_id == package_id))
        # Add new
        for tid in activity_tag_ids:
            db.add(PackageActivityTag(package_id=package_id, activity_tag_id=tid))

    for field, value in update_data.items():
        if field == 'cancellation_rules':
            # Skip here — handled separately below
            continue
        elif field in json_fields and value is not None:
            setattr(package, field, json.dumps(value))
        elif field == 'inclusions' and value is not None:
            # value is a dict or InclusionsSchema
            inclusions_dict = value.dict() if hasattr(value, 'dict') else value
            package.inclusions = _validate_inclusions(inclusions_dict)
        elif field == 'exclusions' and value is not None:
            package.exclusions = value
        elif field == 'slug' and value:
            # Re-generate slug to ensure it has the correct ID suffix and is clean
            from app.services.package_service import PackageService
            package.slug = PackageService.generate_slug(value, package.id)
        else:
            setattr(package, field, value)

    # If GST is being set to not applicable, clear percentage and mode to prevent
    # stale default values (e.g. 18%, exclusive) from lingering in the database.
    if update_data.get('gst_applicable') is False:
        package.gst_percentage = None
        package.gst_mode = None

    # Handle cancellation policy update
    if 'cancellation_enabled' in update_data or 'cancellation_rules' in update_data:
        enabled = update_data.get('cancellation_enabled', package.cancellation_enabled)
        rules_raw = update_data.get('cancellation_rules', None)
        if rules_raw is not None:
            rules_dicts = [r.dict() if hasattr(r, 'dict') else r for r in rules_raw]
        else:
            rules_dicts = package.cancellation_rules or []
        package.cancellation_enabled = enabled
        package.cancellation_rules = _persist_cancellation_rules(enabled, rules_dicts)
    
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    await FastAPICache.clear(namespace="dashboard")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))
    
    # Re-fetch with relationships to ensure valid response model
    from sqlalchemy.orm import selectinload
    stmt = select(Package).options(
        selectinload(Package.itinerary_items),
        selectinload(Package.images),
        selectinload(Package.availability),
        selectinload(Package.trip_styles),
        selectinload(Package.activity_tags)
    ).where(Package.id == package_id)
    result = await db.execute(stmt)
    updated_package = result.scalar_one()
    
    return updated_package


@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "full"))
):
    """Delete a package if owned by agent"""
    stmt = select(Package).where(
        Package.id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )

    # Check for existing bookings
    from app.models import Booking
    stmt = select(Booking).where(Booking.package_id == package_id).limit(1)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete package with existing bookings. Please archive the package instead."
        )

    # Check for linked User Itineraries (Templates)
    from app.models import UserItinerary
    stmt = select(UserItinerary).where(UserItinerary.template_package_id == package_id).limit(1)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete package used as a template in user itineraries. Please archive the package instead."
        )
        
    # Delete trip planning sessions that reference this package
    # (These are loose references, so we just clear them or delete them depends on business logic. 
    # Current logic deletes the session. It might be better to set matched_package_id to NULL, 
    # but the existing code deletes the sessions. We will stick to existing logic or safer set NULL.)
    # Existing logic: DELETE FROM trip_planning_sessions... 
    # Let's keep existing logic to avoid changing behavior, assuming sessions are ephemeral.
    from sqlalchemy import text
    await db.execute(
        text("DELETE FROM trip_planning_sessions WHERE matched_package_id = :package_id"),
        {"package_id": str(package_id)}
    )
    
    # Delete itinerary items (Cascade handles this usually, but explicit is fine)
    stmt = delete(ItineraryItem).where(ItineraryItem.package_id == package_id)
    await db.execute(stmt)
    
    # Delete package
    stmt = delete(Package).where(Package.id == package_id)
    await db.execute(stmt)
    
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    await FastAPICache.clear(namespace="dashboard")
    
    # Clear PDF cache
    try:
        backend = FastAPICache.get_backend()
        await backend.delete(f"pdf:package:{package_id}")
    except:
        pass


@router.patch("/packages/{package_id}/status")
async def toggle_agent_package_status(
    package_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Toggle package publish status if owned by agent"""
    stmt = select(Package).where(
        Package.id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    try:
        status_enum = PackageStatus(new_status.upper())
        # Update status
        package.status = status_enum
    except ValueError:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
        
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    await FastAPICache.clear(namespace="dashboard")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))
    
    await db.refresh(package)
    
    return {"status": package.status, "message": f"Package {new_status.lower()}"}


@router.post("/packages/{package_id}/itinerary-items", response_model=ItineraryItemResponse)
async def add_agent_itinerary_item(
    package_id: UUID,
    item_data: ItineraryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Add an activity to package itinerary"""
    # Verify ownership
    stmt = select(Package).where(
        Package.id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="Package not found")
         
    import json
    
    new_item = ItineraryItem(
        package_id=package_id,
        day_number=item_data.day_number,
        title=item_data.title,
        description=item_data.description,
        time_slot=item_data.time_slot,
        image_url=json.dumps(item_data.image_url) if item_data.image_url else None,
        activities=json.dumps(item_data.activities) if item_data.activities else "[]",
        meals_included=item_data.meals_included,
        display_order=item_data.display_order,
        is_optional=item_data.is_optional or False
    )
    
    db.add(new_item)
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))
    
    await db.refresh(new_item)
    
    return new_item


@router.put("/packages/{package_id}/itinerary-items/{item_id}", response_model=ItineraryItemResponse)
async def update_agent_itinerary_item(
    package_id: UUID,
    item_id: UUID,
    item_data: ItineraryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Update an itinerary item"""
    # Verify ownership implicitly via join or check package first.
    # We'll check the item directly but ensure package belongs to agent
    
    stmt = select(ItineraryItem).join(Package).where(
        ItineraryItem.id == item_id,
        ItineraryItem.package_id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary item not found or access denied"
        )
    
    import json
    # Update fields
    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'activities' and value is not None:
            setattr(item, field, json.dumps(value))
        elif field == 'image_url' and value is not None:
             setattr(item, field, json.dumps(value))
        else:
            setattr(item, field, value)
    
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))
    
    await db.refresh(item)
    
    return item


@router.delete("/packages/{package_id}/itinerary-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_itinerary_item(
    package_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Delete an itinerary item"""
    # Verify ownership
    stmt = select(ItineraryItem).join(Package).where(
        ItineraryItem.id == item_id,
        ItineraryItem.package_id == package_id,
        Package.created_by == current_agent.agent_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="Item not found")

    stmt = delete(ItineraryItem).where(
        ItineraryItem.id == item_id,
        ItineraryItem.package_id == package_id
    )
    await db.execute(stmt)
    await db.commit()
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))


@router.patch("/packages/{package_id}/itinerary-items/reorder")
async def reorder_agent_itinerary_items(
    package_id: UUID,
    item_orders: List[dict],  # [{"id": "uuid", "display_order": 0}, ...]
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("packages", "edit"))
):
    """Reorder itinerary items"""
    # Verify package ownership
    stmt = select(Package).where(Package.id == package_id, Package.created_by == current_agent.agent_id)
    if not (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Package not found")

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
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package_id))
    
    return {"message": "Items reordered successfully"}