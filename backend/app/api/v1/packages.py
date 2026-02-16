"""Package API routes"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from slugify import slugify
from app.database import get_db
from app.models import Package, PackageImage, ItineraryItem, PackageAvailability, PackageStatus, UserRole, Agent
from app.schemas import (
    PackageCreate, PackageUpdate, PackageResponse,
    PackageListResponse, MessageResponse
)
from app.api.deps import get_current_admin, get_optional_current_user, get_current_domain
from app.core.exceptions import NotFoundException

router = APIRouter()

@router.get("/config/durations", response_model=List[int])
async def get_package_durations(
    destination: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Get available package durations for a destination, filtered by the current agent's context.
    Returns a list of distinct duration_days (e.g., [4, 6, 8]).
    """
    print(f"DEBUG DURATIONS: Dest={destination}, Domain={domain}, User={current_user.email if current_user else 'None'}")
    
    query = select(Package.duration_days).distinct().where(Package.status == PackageStatus.PUBLISHED)
    
    # 1. Filter by Agent (Tenant Isolation)
    if current_user and current_user.agent_id:
        print(f"DEBUG DURATIONS: Filtering by User Agent ID: {current_user.agent_id}")
        query = query.where(Package.created_by == current_user.agent_id)
    elif not current_user or (current_user and current_user.role != UserRole.ADMIN):
        # Find Agent by domain
        agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
        print(f"DEBUG DURATIONS: Filtering by Domain Agent: {domain}")
        query = query.where(Package.created_by == agent_subquery)
        # VISIBILITY UPDATE: Show ALL Published packages
        # query = query.where(Package.is_public == True) <-- REMOVED
        
    # 2. Filter by Destination
    if destination:
        print(f"DEBUG DURATIONS: Filtering by Destination ilike: {destination}")
        query = query.where(Package.destination.ilike(f"%{destination}%"))
        
    query = query.order_by(Package.duration_days)
    result = await db.execute(query)
    durations = result.scalars().all()
    print(f"DEBUG DURATIONS: Found {len(durations)} durations: {durations}")
    
    return durations


@router.get("/config/dates", response_model=List[dict])
async def get_package_dates(
    destination: Optional[str] = None,
    duration_days: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Get available date ranges for packages matching filters.
    Returns: [{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}, ...]
    """
    query = select(PackageAvailability).join(Package).where(
        Package.status == PackageStatus.PUBLISHED,
        PackageAvailability.is_blackout == False,
        PackageAvailability.current_bookings < PackageAvailability.max_bookings
    )
    
    # 1. Filter by Agent
    if current_user and current_user.agent_id:
        query = query.where(Package.created_by == current_user.agent_id)
    elif not current_user or (current_user and current_user.role != UserRole.ADMIN):
        agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
        query = query.where(Package.created_by == agent_subquery)
        # VISIBILITY UPDATE: Show ALL Published packages
        # query = query.where(Package.is_public == True) <-- REMOVED
        
    # 2. Filter by Destination
    if destination:
        query = query.where(Package.destination.ilike(f"%{destination}%"))
        
    # 3. Filter by Duration
    if duration_days:
        query = query.where(Package.duration_days == duration_days)
        
    result = await db.execute(query)
    availabilities = result.scalars().all()
    
    # Return formatted ranges
    return [
        {"from": av.available_from, "to": av.available_to}
        for av in availabilities
    ]


@router.get("/config/destinations/popular", response_model=List[str])
async def get_popular_destinations(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Get list of popular destinations based on packages marked as popular.
    """
    query = select(Package.destination).distinct().where(
        Package.status == PackageStatus.PUBLISHED,
        Package.is_popular_destination == True
    )

    # 1. Filter by Agent
    if current_user and current_user.agent_id:
        query = query.where(Package.created_by == current_user.agent_id)
    elif not current_user or (current_user and current_user.role != UserRole.ADMIN):
        agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
        query = query.where(Package.created_by == agent_subquery)

    result = await db.execute(query)
    destinations = result.scalars().all()
    
    # If no popular destinations set, maybe fallback to just any published destinations?
    # For now, let's return what we found. The frontend can handle empty list.
    return destinations


@router.get("/config/suggestions", response_model=List[dict])
async def get_destination_suggestions(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain),
    current_user = Depends(get_optional_current_user)
):
    """
    Get unique destination/country suggestions based on public packages of the current agent.
    """
    
    # Query distinct destinations and countries
    query = select(Package.destination, Package.country).distinct().where(
        Package.status == PackageStatus.PUBLISHED,
        or_(
            Package.destination.ilike(f"%{q}%"),
            Package.country.ilike(f"%{q}%")
        )
    )

    # Resolve the Agent for the current Domain
    stmt = select(Agent).where(Agent.domain == domain)
    result = await db.execute(stmt)
    domain_agent = result.scalar_one_or_none()
    
    if not domain_agent:
        # If no agent found for domain, return empty or handle gracefully
        return []

    # 1. Tenant Isolation: Only show packages created by this Domain's Agent
    query = query.where(Package.created_by == domain_agent.user_id)

    # 2. Visibility Check: Show ALL Published packages (Requested by User)
    # Previously we filtered by is_public for guests, but now we show all Status=Published
    # query = query.where(Package.is_public == True) <-- REMOVED
    
    result = await db.execute(query)
    items = result.all()
    
    suggestions = []
    seen_normalized = set()
    
    for dest, country in items:
        if not dest:
            continue
            
        # Create a user-friendly label
        if country and dest.lower() != country.lower():
            label = f"{dest}, {country}"
        else:
            label = dest
            
        normalized = label.lower().strip()
        if normalized not in seen_normalized:
            suggestions.append({
                "label": label, 
                "value": dest, 
                "type": "city"
            })
            seen_normalized.add(normalized)
                
    return suggestions



@router.get("", response_model=PackageListResponse)
async def list_packages(
    destination: Optional[str] = None,
    country: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    status: PackageStatus = PackageStatus.PUBLISHED,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """List all packages with filters"""
    query = select(Package).where(Package.status == status)

    # Restrict packages based on Domain Context
    # 1. If User is logged in as Customer, they are bound to their Agent (via agent_id)
    if current_user and current_user.agent_id:
        query = query.where(Package.created_by == current_user.agent_id)
    
    # 2. If User is Guest (not logged in) or Agent, use the Domain Header to find the Agent context
    # (Even Agents should see their own packages on their own domain, though they might see all in dashboard)
    # Ideally, for the public site, we filter by the owner of the domain.
    elif not current_user or (current_user and current_user.role != UserRole.ADMIN): 
        # Find Agent who owns this domain
        agent_subquery = select(Agent.user_id).where(
            Agent.domain == domain
        ).scalar_subquery()
        
        # Only show packages created by this agent
        query = query.where(Package.created_by == agent_subquery)
        
        # Limit to Public packages for Guests/Non-Owners
        query = query.where(Package.is_public == True)
    
    # Apply filters
    if destination:
        query = query.where(Package.destination.ilike(f"%{destination}%"))
    if country:
        query = query.where(Package.country.ilike(f"%{country}%"))
    if category:
        query = query.where(Package.category == category)
    if min_price:
        query = query.where(Package.price_per_person >= min_price)
    if max_price:
        query = query.where(Package.price_per_person <= max_price)
    if search:
        query = query.where(
            or_(
                Package.title.ilike(f"%{search}%"),
                Package.description.ilike(f"%{search}%"),
                Package.destination.ilike(f"%{search}%"),
                Package.country.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Eagerly load relationships
    query = query.options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items),
        selectinload(Package.availability)
    )
    
    result = await db.execute(query)
    packages = result.scalars().all()
    
    return PackageListResponse(
        packages=[PackageResponse.model_validate(p) for p in packages],
        total=total,
        page=page,
        page_size=page_size
    )



@router.get("/cheapest", response_model=dict)
async def get_cheapest_package(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Get the lowest-priced published package for the current user's assigned agent 
    (or the agent themselves).
    """
    try:
        from sqlalchemy import asc
        
        stmt = select(Package).where(
            Package.status == PackageStatus.PUBLISHED,
            Package.is_public == True
        )
        
        # Filter by Agent (Tenant Isolation)
        if current_user and current_user.agent_id:
            stmt = stmt.where(Package.created_by == current_user.agent_id)
        elif domain and domain != 'localhost':
            agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
            stmt = stmt.where(Package.created_by == agent_subquery)
            
        # Order by price ascending
        stmt = stmt.order_by(asc(Package.price_per_person))
        stmt = stmt.limit(1)
        
        result = await db.execute(stmt)
        package = result.scalars().first()
        
        if not package:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No packages found."
            )
            
        return {
            'id': str(package.id),
            'title': package.title,
            'destination': package.destination,
            'price_per_person': float(package.price_per_person)
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch cheapest package: {str(e)}"
        )


@router.get("/{package_id}", response_model=PackageResponse)
async def get_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get package by ID"""
    query = select(Package).where(Package.id == package_id).options(
        selectinload(Package.images),
        selectinload(Package.itinerary_items),
        selectinload(Package.availability)
    )
    result = await db.execute(query)
    package = result.scalar_one_or_none()
    
    if not package:
        raise NotFoundException("Package not found")
    
    # Increment view count
    package.view_count = (package.view_count or 0) + 1
    await db.commit()
    await db.refresh(package)
    
    return PackageResponse.model_validate(package)


@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package(
    package_data: PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Create a new package (Admin only)"""
    # Generate slug from title
    slug = slugify(package_data.title)
    
    # Check if slug already exists
    result = await db.execute(select(Package).where(Package.slug == slug))
    if result.scalar_one_or_none():
        # Add random suffix if slug exists
        import random
        slug = f"{slug}-{random.randint(1000, 9999)}"
    
    # Create package
    package = Package(
        title=package_data.title,
        slug=slug,
        description=package_data.description,
        destination=package_data.destination,
        duration_days=package_data.duration_days,
        duration_nights=package_data.duration_nights,
        category=package_data.category,
        price_per_person=package_data.price_per_person,
        max_group_size=package_data.max_group_size,
        included_items=package_data.included_items,
        excluded_items=package_data.excluded_items,
        country=package_data.country,
        is_public=package_data.is_public,
        created_by=current_user.id,
        status=PackageStatus.DRAFT
    )
    
    db.add(package)
    await db.flush()
    
    # Add itinerary items
    for item_data in package_data.itinerary_items:
        itinerary_item = ItineraryItem(
            package_id=package.id,
            **item_data.model_dump()
        )
        db.add(itinerary_item)
    
    # Add availability
    for avail_data in package_data.availability:
        availability = PackageAvailability(
            package_id=package.id,
            **avail_data.model_dump()
        )
        db.add(availability)
    
    await db.commit()
    await db.refresh(package)
    
    return PackageResponse.model_validate(package)


@router.put("/{package_id}", response_model=PackageResponse)
async def update_package(
    package_id: UUID,
    package_data: PackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Update a package (Admin only)"""
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise NotFoundException("Package not found")
    
    # Update fields
    update_data = package_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(package, field, value)
    
    await db.commit()
    await db.refresh(package)
    
    return PackageResponse.model_validate(package)


@router.delete("/{package_id}", response_model=MessageResponse)
async def delete_package(
    package_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Delete a package (Admin only)"""
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise NotFoundException("Package not found")
    
    # Delete trip planning sessions that reference this package
    from sqlalchemy import text, delete
    await db.execute(
        text("DELETE FROM trip_planning_sessions WHERE matched_package_id = :package_id"),
        {"package_id": str(package_id)}
    )
    
    # Delete itinerary items
    await db.execute(delete(ItineraryItem).where(ItineraryItem.package_id == package_id))
    
    # Delete the package
    await db.delete(package)
    await db.commit()
    
    return MessageResponse(message="Package deleted successfully")
