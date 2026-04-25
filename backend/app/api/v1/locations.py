from typing import List, Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, over
from fastapi_cache.decorator import cache

from app.database import get_db
from app.api.deps import get_current_domain
from app.models import Package, PackageStatus, Agent, Destination

router = APIRouter()

# A small preloaded dataset for common countries to satisfy the requirement
# In a real-world scenario, this would be a full database or a larger JSON file
CITY_DATA = {
    "India": [
        "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", 
        "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", 
        "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", 
        "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", 
        "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", 
        "Ranchi", "Howrah", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", 
        "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubli-Dharwad", "Bareilly"
    ],
    "United Arab Emirates": [
        "Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"
    ],
    "Singapore": ["Singapore"],
    "Thailand": ["Bangkok", "Phuket", "Chiang Mai", "Pattaya", "Krabi", "Koh Samui"],
    "Indonesia": ["Jakarta", "Bali", "Surabaya", "Bandung", "Medan", "Semarang"],
    "Malaysia": ["Kuala Lumpur", "George Town", "Ipoh", "Kuching", "Johor Bahru"],
    "Vietnam": ["Ho Chi Minh City", "Hanoi", "Da Nang", "Haiphong", "Can Tho"],
}

@router.get("/cities", response_model=List[str])
@cache(expire=3600)  # Cache for 1 hour
async def get_cities(country: Optional[str] = Query(None, description="Country name to fetch cities for")):
    """
    Fetch all cities for a given country.
    If no country is provided, returns an empty list or could return popular global cities.
    """
    if not country:
        # Return a flattened list of all cities if no country specified (global search)
        all_cities = []
        for cities in CITY_DATA.values():
            all_cities.extend(cities)
        return sorted(list(set(all_cities)))
    
    # Simple direct match for now
    cities = CITY_DATA.get(country, [])
    
    # If not found in our small subset, the frontend will still have the full list from country-state-city
    return sorted(cities)


@router.get("/popular")
async def get_popular_destinations(
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """
    Get popular destinations grouped by location and count how many packages exist per destination.
    Only shows destinations that have at least 1 published package.
    Sorted by highest package count first.
    """
    # 1. Get Agent ID from domain
    agent_stmt = select(Agent.user_id).where(Agent.domain == domain)
    agent_result = await db.execute(agent_stmt)
    agent_id = agent_result.scalar()
    
    if not agent_id:
        return []

    # 2. Resolve WHICH destinations are marked "popular" for this specific agent
    # STRICT CONTROL: Only show destinations that this agent has explicitly managed/enabled.
    # This prevents system defaults (like "Automation Dest") from leaking onto the homepage.
    popular_meta = select(
        Destination.name,
        Destination.country,
        Destination.image_url,
        Destination.display_order
    ).where(
        and_(
            Destination.agent_id == agent_id,
            Destination.is_popular == True,
            Destination.is_active == True
        )
    ).subquery()
    
    # 3. Join with packages to get the counts for these destinations
    stmt = (
        select(
            popular_meta.c.name,
            popular_meta.c.country.label("meta_country"),
            popular_meta.c.image_url,
            popular_meta.c.display_order,
            func.count(Package.id).label("pkg_count")
        )
        .outerjoin(
            Package,
            and_(
                Package.destination == popular_meta.c.name,
                Package.created_by == agent_id,
                Package.status == PackageStatus.PUBLISHED,
                Package.is_public == True
            )
        )
        .group_by(
            popular_meta.c.name,
            popular_meta.c.country,
            popular_meta.c.image_url,
            popular_meta.c.display_order
        )
        .order_by(popular_meta.c.display_order.asc(), func.count(Package.id).desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    response = []
    for row in rows:
        # Fallback logic for country to avoid "UNKNOWN"
        country_display = row.meta_country
        if not country_display or country_display.lower() == "unknown":
            country_display = "International"

        response.append({
            "name": row.name,
            "country": country_display,
            "image_url": row.image_url,
            "pkg_count": row.pkg_count
        })
    
    return response
