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
import json
from app.api.deps import get_current_admin, get_optional_current_user, get_current_domain
from app.core.exceptions import NotFoundException
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache
from app.tasks.pdf_tasks import generate_package_pdf_task

router = APIRouter()

@router.get("/config/durations", response_model=List[int])
@cache(expire=300, namespace="packages")
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
@cache(expire=300, namespace="packages")
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



@router.get("/config/destinations/popular", response_model=List[dict])
@cache(expire=300, namespace="packages")
async def get_popular_destinations(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Get list of popular destinations based on packages marked as is_public=True.
    Returns deduplicated list by destination with the most recently updated package image.
    """
    from sqlalchemy import func as sqlfunc

    # Build the base query — select all public, published packages
    query = select(Package).where(
        Package.status == PackageStatus.PUBLISHED,
        Package.is_public == True
    )

    # Tenant isolation
    if current_user and current_user.agent_id:
        query = query.where(Package.created_by == current_user.agent_id)
    elif not current_user or (current_user and current_user.role != UserRole.ADMIN):
        agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
        query = query.where(Package.created_by == agent_subquery)

    # Order by most recently updated so we pick the best image per destination
    from sqlalchemy.orm import selectinload
    query = query.options(selectinload(Package.images)).order_by(Package.updated_at.desc().nullslast(), Package.created_at.desc())

    result = await db.execute(query)
    packages = result.scalars().all()

    # Deduplicate by destination — keep first occurrence (most recently updated)
    seen: dict = {}
    for pkg in packages:
        dest_key = pkg.destination.strip().lower()
        if dest_key not in seen:
            seen[dest_key] = pkg

    # Build response objects
    destinations = []
    for pkg in seen.values():
        # Count total public packages for this destination
        count_q = select(sqlfunc.count(Package.id)).where(
            Package.status == PackageStatus.PUBLISHED,
            Package.is_public == True,
            Package.destination.ilike(f"%{pkg.destination}%")
        )
        count_result = await db.execute(count_q)
        pkg_count = count_result.scalar() or 1

        # Image priority: feature_image_url > first package image > None
        image_url = pkg.feature_image_url
        if not image_url and pkg.images:
            image_url = pkg.images[0].image_url if pkg.images else None

        destinations.append({
            "destination": pkg.destination,
            "image_url": image_url,
            "package_count": pkg_count,
            "slug": pkg.slug,
        })

    return destinations



@router.get("/config/suggestions", response_model=List[dict])
@cache(expire=300, namespace="packages")
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
@cache(expire=300, namespace="packages")
async def list_packages(
    destination: Optional[str] = None,
    country: Optional[str] = None,
    trip_style: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    package_mode: Optional[str] = None,
    duration_min: Optional[int] = None,
    duration_max: Optional[int] = None,
    activities: Optional[List[str]] = Query(None),
    trip_styles: Optional[List[str]] = Query(None),
    countries: Optional[List[str]] = Query(None),
    sort: Optional[str] = None,
    status: PackageStatus = PackageStatus.PUBLISHED,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """List all packages with filters"""
    from sqlalchemy.orm import selectinload
    query = select(Package).options(selectinload(Package.dest_metadata)).where(Package.status == status)

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
    
    # Apply simple filters
    if destination:
        query = query.where(Package.destination.ilike(f"%{destination}%"))
    if country:
        query = query.where(Package.country.ilike(f"%{country}%"))
    if trip_style:
        query = query.where(Package.trip_style == trip_style)
    if min_price:
        query = query.where(Package.price_per_person >= min_price)
    if max_price:
        query = query.where(Package.price_per_person <= max_price)
    if package_mode:
        query = query.where(Package.package_mode == package_mode)
    
    # Duration Filter: Search against duration_days
    # If using total_days or duration_days calculation could vary, duration_days is the base
    if duration_min is not None:
        query = query.where(Package.duration_days >= duration_min)
    if duration_max is not None:
        query = query.where(Package.duration_days <= duration_max)

    # Array Filters
    if activities and len(activities) > 0:
        # Assuming activities is a JSON string of a list
        # E.g., '["Beach", "Mountain"]'
        # SQLAlchemy sqlite JSON contains is tricky, ilike is safer across DBs for text representation
        # or use specialized JSON functions depending on the database.
        # Fallback to ilike for SQLite/generic fallback:
        activity_conditions = [Package.activities.ilike(f'%"{activity}"%') for activity in activities]
        query = query.where(or_(*activity_conditions))
        
    if trip_styles and len(trip_styles) > 0:
        query = query.where(Package.trip_style.in_(trip_styles))

    if countries and len(countries) > 0:
        country_conditions = [Package.country.ilike(f"%{c}%") for c in countries]
        # Also check within destinations JSON
        country_conditions.extend([Package.destinations.ilike(f'%"{c}"%') for c in countries])
        query = query.where(or_(*country_conditions))

    # Complex Search
    if search:
        search_term = f"%{search}%"
        # Check for European search alias
        european_countries = [
            "France", "Italy", "Spain", "Germany", "Portugal",
            "Greece", "Netherlands", "Switzerland", "Austria",
            "Belgium", "Czech Republic", "Hungary", "Croatia",
            "Sweden", "Norway", "Denmark", "Poland", "Turkey"
        ]
        
        is_european_search = "europe" in search.lower()
        
        if is_european_search:
            # Create OR conditions for European countries
            eu_conditions = []
            for eu_c in european_countries:
                eu_conditions.append(Package.country.ilike(f"%{eu_c}%"))
                eu_conditions.append(Package.destinations.ilike(f'%"{eu_c}"%'))
            # Combine with standard title search
            query = query.where(
                or_(
                    Package.title.ilike(search_term),
                    *eu_conditions
                )
            )
        else:
            query = query.where(
                or_(
                    Package.title.ilike(search_term),
                    Package.description.ilike(search_term),
                    Package.destination.ilike(search_term),
                    Package.country.ilike(search_term),
                    # Search within the JSON arrays/text fields
                    Package.destinations.ilike(search_term),
                    Package.trip_style.ilike(search_term),
                    Package.activities.ilike(search_term)
                )
            )
            
    # Apply Sorting
    from sqlalchemy import case, cast, Integer, desc, asc
    if sort == "price_asc":
        query = query.order_by(asc(Package.price_per_person))
    elif sort == "price_desc":
        query = query.order_by(desc(Package.price_per_person))
    elif sort == "duration_asc":
        query = query.order_by(asc(Package.duration_days))
    elif sort == "duration_desc":
        query = query.order_by(desc(Package.duration_days))
    elif sort == "newest":
        query = query.order_by(desc(Package.created_at))
    else: # Recommended (default)
        # Recommended sort logic: 
        # score = (is_popular_destination * 2) + (view_count / 10) + recency (simplified to just view_count and popularity for now)
        query = query.order_by(
            desc(Package.is_popular_destination),
            desc(Package.view_count)
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
        selectinload(Package.availability),
        selectinload(Package.dest_metadata)
    )
    
    result = await db.execute(query)
    packages = result.scalars().unique().all()
    
    return PackageListResponse(
        packages=[PackageResponse.model_validate(p) for p in packages],
        total=total,
        page=page,
        page_size=page_size
    )



@router.get("/cheapest", response_model=dict)
@cache(expire=300, namespace="packages")
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
            'slug': package.slug,
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


@router.get("/slug/{slug}", response_model=PackageResponse)
async def get_package_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get package by slug"""
    query = select(Package).where(Package.slug == slug).options(
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


@router.get("/{package_id}/itinerary-pdf")
async def get_package_itinerary_pdf(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Download package itinerary as PDF"""
    from fastapi import Response
    from app.services.itinerary_pdf_service import ItineraryPdfService
    
    query = select(Package).where(Package.id == package_id).options(
        selectinload(Package.itinerary_items)
    )
    result = await db.execute(query)
    package = result.scalar_one_or_none()
    
    if not package:
        raise NotFoundException("Package not found")
        
    # 1. Try fetching from Redis Cache first
    try:
        backend = FastAPICache.get_backend()
        cache_key = f"pdf:package:{package_id}"
        cached_pdf = await backend.get(cache_key)
        if cached_pdf:
            print(f"DEBUG: Serving PDF for {package_id} from Redis cache")
            headers = {
                'Content-Disposition': f'attachment; filename="Itinerary_{package.slug}.pdf"'
            }
            return Response(content=cached_pdf, media_type="application/pdf", headers=headers)
    except Exception as e:
        print(f"DEBUG: Cache fetch failed: {e}")

    # 2. Fallback to Sync Generation (and trigger async for future)
    pdf_bytes = ItineraryPdfService.generate_itinerary_pdf(package)
    generate_package_pdf_task.delay(str(package_id))
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
         
    # Return as file download
    headers = {
        'Content-Disposition': f'attachment; filename="Itinerary_{package.slug}.pdf"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

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
        included_items=json.dumps(package_data.included_items or []),
        excluded_items=json.dumps(package_data.excluded_items or []),
        country=package_data.country,
        destinations=json.dumps(package_data.destinations or []),
        activities=json.dumps(package_data.activities or []),
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
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package.id))
    
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
    json_fields = ['included_items', 'excluded_items', 'destinations', 'activities']
    
    for field, value in update_data.items():
        if field in json_fields and value is not None:
            setattr(package, field, json.dumps(value))
        else:
            setattr(package, field, value)
    
    await db.commit()
    await db.refresh(package)
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Pre-generate PDF in background
    generate_package_pdf_task.delay(str(package.id))
    
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
    
    # Invalidate cache
    await FastAPICache.clear(namespace="packages")
    
    # Clear PDF cache
    try:
        backend = FastAPICache.get_backend()
        await backend.delete(f"pdf:package:{package_id}")
    except:
        pass
    
    # Delete the package
    await db.delete(package)
    await db.commit()
    
    return MessageResponse(message="Package deleted successfully")
