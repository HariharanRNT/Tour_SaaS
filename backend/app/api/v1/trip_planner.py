"""Trip Planner API endpoints"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from uuid import UUID
import uuid
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.api.deps import get_optional_current_user, get_current_domain
from app.models import Package, PackageStatus, ItineraryItem, Agent
from app.schemas import TripSessionUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user-drafts/latest")
async def get_latest_user_draft(
    exclude_session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Get the most recent active session for the logged-in user"""
    if not current_user:
        return None

    # Base query
    query_str = """
        SELECT t.id, t.destination, t.duration_days, t.duration_nights, t.start_date,
               t.travelers, t.preferences, t.matched_package_id, t.itinerary, t.status,
               t.created_at, t.expires_at, p.price_per_person, p.description, t.flight_details
        FROM trip_planning_sessions t
        LEFT JOIN packages p ON t.matched_package_id = p.id
        WHERE t.user_id = :user_id AND t.status = 'active' AND t.expires_at > NOW()
    """
    
    params = {"user_id": current_user.id}
    
    if exclude_session_id:
        query_str += " AND t.id != :exclude_id"
        params["exclude_id"] = exclude_session_id
        
    query_str += " ORDER BY t.updated_at DESC LIMIT 1"
    
    result = await db.execute(text(query_str), params)
    row = result.fetchone()
    
    if not row:
        return None
    
    # Helper to safe parse JSON
    def parse_json_field(field):
        if isinstance(field, str):
            try:
                return json.loads(field)
            except:
                return field
        return field
        
    return {
        "session_id": str(row[0]),
        "destination": row[1],
        "duration_days": row[2],
        "duration_nights": row[3],
        "start_date": row[4].isoformat() if row[4] else None,
        "travelers": parse_json_field(row[5]),
        "preferences": parse_json_field(row[6]),
        "matched_package_id": str(row[7]) if row[7] else None,
        "itinerary": parse_json_field(row[8]),
        "status": row[9],
        "created_at": row[10].isoformat(),
        "expires_at": row[11].isoformat(),
        "flight_details": parse_json_field(row[14])
    }


@router.get("/user-sessions")
async def get_user_trip_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Get all active trip planning sessions for the current user"""
    if not current_user:
        return []

    query_str = """
        SELECT t.id, t.destination, t.duration_days, t.duration_nights, t.start_date,
               t.travelers, t.preferences, t.matched_package_id, t.itinerary, t.status,
               t.created_at, t.expires_at, p.price_per_person, p.description, t.flight_details
        FROM trip_planning_sessions t
        LEFT JOIN packages p ON t.matched_package_id = p.id
        WHERE t.user_id = :user_id AND t.status = 'active' AND t.expires_at > NOW()
        ORDER BY t.updated_at DESC
    """
    
    result = await db.execute(text(query_str), {"user_id": current_user.id})
    rows = result.fetchall()
    
    # Helper to safe parse JSON
    def parse_json_field(field):
        if isinstance(field, str):
            try:
                return json.loads(field)
            except:
                return field
        return field
        
    sessions = []
    for row in rows:
        sessions.append({
            "session_id": str(row[0]),
            "destination": row[1],
            "duration_days": row[2],
            "duration_nights": row[3],
            "start_date": row[4].isoformat() if row[4] else None,
            "travelers": parse_json_field(row[5]),
            "preferences": parse_json_field(row[6]),
            "matched_package_id": str(row[7]) if row[7] else None,
            "itinerary": parse_json_field(row[8]),
            "status": row[9],
            "created_at": row[10].isoformat(),
            "expires_at": row[11].isoformat(),
            "price_per_person": float(row[12]) if row[12] else 0,
            "package_description": row[13] if row[13] else "",
            "flight_details": parse_json_field(row[14])
        })
    
    return sessions


@router.get("/popular-destinations")
async def get_popular_destinations(
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """
    Get list of popular destinations derived from packages where is_public = true.
    """
    # 1. Get Agent ID from domain
    agent_stmt = select(Agent.user_id).where(Agent.domain == domain)
    agent_result = await db.execute(agent_stmt)
    agent_id = agent_result.scalar()
    
    if not agent_id:
        return []

    # 2. Find unique destinations from public packages of this agent
    # We include is_popular_destination but don't strictly filter by it yet 
    # to ensure destinations show up if they are the only ones available.
    # However, to respect "Popular" we prioritize them.
    pkg_stmt = select(
        Package.destination, 
        Package.country,
        func.max(Package.description).label('description'),
        func.count().label('pkg_count'),
        func.min(Package.price_per_person).label('min_price'),
        func.min(Package.duration_days).label('min_duration'),
        func.max(Package.duration_days).label('max_duration')
    ).where(
        Package.created_by == agent_id,
        Package.status == PackageStatus.PUBLISHED,
        Package.is_public == True
    ).group_by(Package.destination, Package.country)
    
    pkg_result = await db.execute(pkg_stmt)
    pkg_destinations = pkg_result.all()
    
    if not pkg_destinations:
        return []

    # 3. Enrich with popular_destinations table data if available
    # We'll do this in memory or with a separate query for simplicity/flexibility
    pd_stmt = select(
        text("id, name, description, image_url, display_order")
    ).select_from(text("popular_destinations")).where(text("is_active = TRUE"))
    
    pd_result = await db.execute(pd_stmt)
    pd_data = {row[1].lower(): row for row in pd_result.fetchall()}

    response = []
    
    # Get all package images for these destinations to pick a representative one
    dest_names = [pkg_dest.destination for pkg_dest in pkg_destinations]
    from app.models import PackageImage
    img_stmt = select(
        Package.destination,
        PackageImage.image_url
    ).join(PackageImage, Package.id == PackageImage.package_id).where(
        Package.destination.in_(dest_names),
        Package.created_by == agent_id
    ).order_by(PackageImage.display_order.asc())
    
    img_result = await db.execute(img_stmt)
    # Map destination -> first image
    dest_images = {}
    for dest, img in img_result.all():
        if dest not in dest_images:
            dest_images[dest] = img

    # Get feature images
    feat_img_stmt = select(
        Package.destination,
        Package.feature_image_url
    ).where(
        Package.destination.in_(dest_names),
        Package.created_by == agent_id,
        Package.feature_image_url.isnot(None)
    )
    
    feat_img_result = await db.execute(feat_img_stmt)
    feat_images = {}
    for dest, img in feat_img_result.all():
        if img: # Ensure not empty string
             # Prioritize latest package or any? Query order is undefined, we assume any valid one is fine, 
             # or we could order by created_at desc in subquery but let's just take one.
             if dest not in feat_images:
                feat_images[dest] = img

    for pkg_dest in pkg_destinations:
        dest_name = pkg_dest.destination
        country_name = pkg_dest.country
        lookup_key = dest_name.lower()
        
        # Check for match in master popular_destinations table
        master_match = pd_data.get(lookup_key)
        
        destination_data = {
            "name": dest_name,
            "country": country_name,
            "description": pkg_dest.description,
            "image_url": feat_images.get(dest_name) or dest_images.get(dest_name),
            "min_price": float(pkg_dest.min_price) if pkg_dest.min_price else 0,
            "min_duration": pkg_dest.min_duration,
            "max_duration": pkg_dest.max_duration,
            "pkg_count": pkg_dest.pkg_count
        }

        if master_match:
            response.append({
                "id": str(master_match[0]),  # id
                "name": master_match[1],  # name
                "country": country_name,  # Use country from package data
                "description": master_match[2] or destination_data["description"],  # description
                "image_url": master_match[3] or destination_data["image_url"],  # image_url
                "display_order": master_match[4],  # display_order
                "min_price": destination_data["min_price"],
                "min_duration": destination_data["min_duration"],
                "max_duration": destination_data["max_duration"],
                "pkg_count": destination_data["pkg_count"]
            })
        else:
            # Create a dynamic entry from package data
            response.append({
                "id": str(uuid.uuid4()),
                "name": dest_name,
                "country": country_name,
                "description": pkg_dest.description,
                "image_url": destination_data["image_url"],
                "display_order": 999,
                "min_price": destination_data["min_price"],
                "min_duration": destination_data["min_duration"],
                "max_duration": destination_data["max_duration"],
                "pkg_count": destination_data["pkg_count"]
            })
            
    # Sort by display order then name
    response.sort(key=lambda x: (x['display_order'], x['name']))
    
    return response


@router.post("/match-destination")
async def match_destination(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Check if destination has matching packages"""
    destination = data.get('destination', '').strip()
    duration_days = data.get('duration_days')
    category = data.get('category')
    
    if not destination:
        raise HTTPException(status_code=400, detail="Destination is required")
    
    # Search for matching packages
    stmt = select(Package).where(
        and_(
            Package.status == PackageStatus.PUBLISHED,
            Package.is_public == True,
            or_(
                func.lower(Package.destination).like(f"%{destination.lower()}%"),
                func.lower(Package.country).like(f"%{destination.lower()}%")
            )
        )
    )

    # Restrict packages for Agent's Customers
    if current_user and current_user.agent_id:
        stmt = stmt.where(Package.created_by == current_user.agent_id)
    
    # Add duration filter (±1 day tolerance)
    if duration_days:
        stmt = stmt.where(
            Package.duration_days.between(duration_days - 1, duration_days + 1)
        )
    
    # Add category filter if provided
    if category:
        stmt = stmt.where(func.lower(Package.category) == category.lower())
    
    # Order by popularity and exact match
    stmt = stmt.order_by(
        Package.is_popular_destination.desc(),
        Package.created_at.desc()
    ).limit(1)
    
    result = await db.execute(stmt)
    package = result.scalar_one_or_none()
    
    if not package:
        return {
            "has_match": False,
            "package": None,
            "match_score": 0.0
        }
    
    # Calculate match score
    match_score = 0.5  # Base score for destination match
    
    if duration_days and package.duration_days == duration_days:
        match_score += 0.3
    
    if category and package.category and package.category.lower() == category.lower():
        match_score += 0.2
    
    # Get itinerary for matched package
    stmt = select(ItineraryItem).where(
        ItineraryItem.package_id == package.id
    ).order_by(ItineraryItem.day_number, ItineraryItem.display_order)
    
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    # Organize by day and time slot
    itinerary_by_day = {}
    for item in items:
        day = item.day_number
        if day not in itinerary_by_day:
            itinerary_by_day[day] = {
                "day_number": day,
                "morning": [],
                "afternoon": [],
                "evening": [],
                "night": [],
                "half_day": [],
                "full_day": []
            }
        
        time_slot = (item.time_slot or 'morning').lower()
        if time_slot in itinerary_by_day[day]:
            activities_list = []
            try:
                activities_list = json.loads(item.activities) if item.activities else []
            except:
                activities_list = []
            
            # Parse image_url if it's a JSON list
            image_url_val = item.image_url
            if image_url_val and isinstance(image_url_val, str) and (image_url_val.strip().startswith('[') or image_url_val.strip().startswith('{')):
                try:
                    image_url_val = json.loads(image_url_val)
                except:
                    pass

            itinerary_by_day[day][time_slot].append({
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "image_url": image_url_val,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "activities": activities_list,
                "meals_included": item.meals_included,
                "display_order": item.display_order
            })
    
    return {
        "has_match": True,
        "match_score": match_score,
        "package": {
            "id": str(package.id),
            "title": package.title,
            "destination": package.destination,
            "duration_days": package.duration_days,
            "duration_nights": package.duration_nights,
            "category": package.category,
            "price_per_person": float(package.price_per_person),
            "description": package.description,
            "itinerary_by_day": list(itinerary_by_day.values())
        }
    }


@router.post("/create-session")
async def create_trip_session(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Create a trip planning session"""
    try:
        # Extract data with better defaults and safety
        destination = data.get('destination', '').strip()
        matched_package_id = data.get('package_id')
        
        duration_days_val = data.get('duration_days')
        try:
            duration_days = int(duration_days_val) if duration_days_val is not None else 7
        except (ValueError, TypeError):
            duration_days = 7
            
        duration_nights_val = data.get('duration_nights')
        try:
            duration_nights = int(duration_nights_val) if duration_nights_val is not None else (duration_days - 1)
        except (ValueError, TypeError):
            duration_nights = duration_days - 1
            
        start_date_str = data.get('start_date')
        travelers = data.get('travelers') or {"adults": 2, "children": 0, "infants": 0}
        preferences = data.get('preferences') or {}
        
        # Parse start_date if provided
        start_date = None
        if start_date_str:
            from datetime import datetime
            try:
                # Try simple date first
                start_date = datetime.strptime(start_date_str.split('T')[0], '%Y-%m-%d').date()
            except Exception as de:
                logger.warning(f"Failed to parse start_date {start_date_str}: {de}")
        
        if not destination and not matched_package_id:
            raise HTTPException(status_code=400, detail="Destination is required")
        
        # Check for matching package
        if not matched_package_id or matched_package_id == '':
            matched_package_id = None
            
        initial_itinerary = []
        has_match = False
        match_score = 0.0
        
        package = None
        
        # Initialize variables
        category = preferences.get('category')

        if matched_package_id:
            # Fetch specific package
            stmt = select(Package).where(Package.id == matched_package_id)
            result = await db.execute(stmt)
            package = result.scalar_one_or_none()
            
            if package:
                # If we have a specific package, use its details to override/fill defaults if needed
                if not destination:
                    destination = package.destination
                
                # If destination is still missing after package lookup, then error out
                if not destination:
                    raise HTTPException(status_code=400, detail="Destination could not be determined from package")
        else:
            # Search for matching packages
            stmt = select(Package).where(
                and_(
                    Package.status == PackageStatus.PUBLISHED,
                    Package.is_public == True,
                    or_(
                        func.lower(Package.destination).like(f"%{destination.lower()}%"),
                        func.lower(Package.country).like(f"%{destination.lower()}%")
                    )
                )
            )
            
            # Restrict packages for Agent's Customers
            if current_user and current_user.agent_id:
                stmt = stmt.where(Package.created_by == current_user.agent_id)
            
            # Add duration filter (±1 day tolerance)
            if duration_days:
                stmt = stmt.where(
                    Package.duration_days.between(duration_days - 1, duration_days + 1)
                )
            
            # Add category filter if provided
            if category:
                stmt = stmt.where(func.lower(Package.category) == category.lower())
            
            # Order by popularity and exact match
            stmt = stmt.order_by(
                Package.is_popular_destination.desc(),
                Package.created_at.desc()
            ).limit(1)
            
            result = await db.execute(stmt)
            package = result.scalar_one_or_none()
        
        if package:
            has_match = True
            matched_package_id = str(package.id)
            
            # Calculate match score
            match_score = 0.5  # Base score for destination match
            if package.duration_days == duration_days:
                match_score += 0.3
            if category and package.category and package.category.lower() == category.lower():
                match_score += 0.2
            
            # Get itinerary for matched package
            stmt = select(ItineraryItem).where(
                ItineraryItem.package_id == package.id
            ).order_by(ItineraryItem.day_number, ItineraryItem.display_order)
            
            result = await db.execute(stmt)
            items = result.scalars().all()
            
            # Organize by day and time slot
            itinerary_by_day = {}
            for item in items:
                day = item.day_number
                if day not in itinerary_by_day:
                    itinerary_by_day[day] = {
                        "day_number": day,
                        "morning": [],
                        "afternoon": [],
                        "evening": [],
                        "night": [],
                        "half_day": [],
                        "full_day": []
                    }
                
                time_slot = (item.time_slot or 'morning').lower()
                if time_slot in itinerary_by_day[day]:
                    activities_list = []
                    try:
                        activities_list = json.loads(item.activities) if item.activities else []
                    except:
                        activities_list = []
                    
                    # Parse image_url if it's a JSON list
                    image_url_val = item.image_url
                    if image_url_val and isinstance(image_url_val, str) and (image_url_val.strip().startswith('[') or image_url_val.strip().startswith('{')):
                        try:
                            image_url_val = json.loads(image_url_val)
                        except:
                            pass

                    itinerary_by_day[day][time_slot].append({
                        "id": str(item.id),
                        "title": item.title,
                        "description": item.description,
                        "image_url": image_url_val,
                        "start_time": item.start_time,
                        "end_time": item.end_time,
                        "activities": activities_list
                    })
            
            initial_itinerary = list(itinerary_by_day.values())
        
        # Final destination check
        if not destination:
            raise HTTPException(status_code=400, detail="Destination is required and could not be determined")

        # Create session
        new_id = uuid.uuid4()
        query = text("""
            INSERT INTO trip_planning_sessions 
            (id, destination, duration_days, duration_nights, start_date, travelers, preferences, matched_package_id, itinerary, status, user_id)
            VALUES (:id, :dest, :days, :nights, :start, :travelers, :prefs, :pkg_id, :itin, :status, :user_id)
            RETURNING id, created_at, expires_at
        """)
        
        result = await db.execute(
            query,
            {
                "id": new_id,
                "dest": destination,
                "days": duration_days,
                "nights": duration_nights,
                "start": start_date,
                "travelers": json.dumps(travelers),
                "prefs": json.dumps(preferences),
                "pkg_id": matched_package_id,
                "itin": json.dumps(initial_itinerary),
                "status": "active",
                "user_id": current_user.id if current_user else None
            }
        )
        
        row = result.fetchone()
        session_id = str(row[0])
        
        await db.commit()
        
        return {
            "session_id": session_id,
            "destination": destination,
            "duration_days": duration_days,
            "duration_nights": duration_nights,
            "matched_package_id": matched_package_id,
            "has_match": has_match,
            "match_score": match_score,
            "itinerary": initial_itinerary,
            "expires_at": row[2].isoformat()
        }
        
    except Exception as e:
        logger.exception("Error in create_trip_session")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/session/{session_id}")
async def get_trip_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """Get trip planning session"""
    query = text("""
        SELECT t.id, t.destination, t.duration_days, t.duration_nights, t.start_date,
               t.travelers, t.preferences, t.matched_package_id, t.itinerary, t.status,
               t.created_at, t.expires_at, p.price_per_person, p.description, t.flight_details,
               a.gst_inclusive, a.gst_percentage
        FROM trip_planning_sessions t
        LEFT JOIN packages p ON t.matched_package_id = p.id
        LEFT JOIN agents a ON p.created_by = a.id
        WHERE t.id = :session_id AND t.status = 'active' AND t.expires_at > NOW()
    """)
    
    result = await db.execute(query, {"session_id": str(session_id)})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    # Helper to safe parse JSON
    def parse_json_field(field):
        if isinstance(field, str):
            try:
                return json.loads(field)
            except:
                return field
        return field

    itinerary = parse_json_field(row[8])
    matched_package_id = row[7]
    travelers = parse_json_field(row[5])
    preferences = parse_json_field(row[6])
    flight_details = parse_json_field(row[14])
    
    # GST Settings Logic
    # 1. Default to Package Creator's settings (from join)
    gst_inclusive = row[15]
    gst_percentage = row[16]
    
    # 2. If accessed via a custom domain, prefer the Domain Agent's settings
    # This ensures that when an agent sells a package (even a system package), 
    # THEIR GST settings apply, not the package creator's.
    if domain:
        agent_stmt = select(Agent).where(Agent.domain == domain)
        agent_res = await db.execute(agent_stmt)
        agent = agent_res.scalar_one_or_none()
        if agent:
             # Override with Domain Agent's GST settings
             gst_inclusive = agent.gst_inclusive
             gst_percentage = agent.gst_percentage

    # Enrich itinerary with latest times from package items if available
    # This handles cases where the session was created before times were added to package
    if matched_package_id and itinerary and isinstance(itinerary, list):
        try:
            # Fetch fresh items to get latest times
            stmt = select(ItineraryItem).where(ItineraryItem.package_id == matched_package_id)
            pkg_result = await db.execute(stmt)
            pkg_items = pkg_result.scalars().all()
            
            # Map item ID to time info
            item_map = {str(item.id): {"start_time": item.start_time, "end_time": item.end_time} for item in pkg_items}
            
            # Update session itinerary items in memory
            for day in itinerary:
                for slot in ['morning', 'afternoon', 'evening', 'night', 'half_day', 'full_day']:
                    if slot in day and isinstance(day[slot], list):
                        for activity in day[slot]:
                            act_id = activity.get('id')
                            if act_id and act_id in item_map:
                                activity['start_time'] = item_map[act_id]['start_time']
                                activity['end_time'] = item_map[act_id]['end_time']
        except Exception as e:
            print(f"Error enriching itinerary times: {e}")
            # Continue without enrichment on error
            pass

    return {
        "session_id": str(row[0]),
        "destination": row[1],
        "duration_days": row[2],
        "duration_nights": row[3],
        "start_date": row[4].isoformat() if row[4] else None,
        "travelers": travelers,
        "preferences": preferences,
        "matched_package_id": str(matched_package_id) if matched_package_id else None,
        "itinerary": itinerary,
        "status": row[9],
        "created_at": row[10].isoformat(),
        "expires_at": row[11].isoformat(),
        "price_per_person": float(row[12]) if row[12] else 0,
        "package_description": row[13] if row[13] else "",
        "flight_details": flight_details,
        "gst_inclusive": gst_inclusive,
        "gst_percentage": float(gst_percentage) if gst_percentage is not None else 0
    }


@router.put("/session/{session_id}")
async def update_trip_session(
    session_id: UUID,
    payload: TripSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Update trip planning session itinerary"""
    try:
        # Convert Pydantic models to dicts for JSON storage
        itinerary = [day.model_dump() for day in payload.itinerary]
        flight_details = payload.flight_details.model_dump(by_alias=True) if payload.flight_details else {}
        
        query = text("""
            UPDATE trip_planning_sessions
            SET itinerary = :itin, flight_details = :flight_details, updated_at = NOW(),
                user_id = COALESCE(user_id, :user_id)
            WHERE id = :session_id AND status = 'active' AND expires_at > NOW()
            RETURNING id
        """)
        
        result = await db.execute(query, {
            "itin": json.dumps(itinerary), 
            "flight_details": json.dumps(flight_details),
            "session_id": str(session_id),
            "user_id": current_user.id if current_user else None
        })
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        await db.commit()
        
        return {"message": "Session updated successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/session/{session_id}")
async def delete_trip_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_optional_current_user)
):
    """Delete (cancel) a trip planning session"""
    try:
        # Check ownership if user is logged in
        if current_user:
            check_stmt = text("SELECT user_id FROM trip_planning_sessions WHERE id = :id")
            check_result = await db.execute(check_stmt, {"id": str(session_id)})
            owner_id = check_result.scalar()
            
            # Allow deletion if user owns it or if it has no owner (anonymous session)
            # If it has an owner and it's not the current user, forbid (unless admin - simplistic check here)
            if owner_id and str(owner_id) != str(current_user.id) and current_user.role != 'admin':
                  raise HTTPException(status_code=403, detail="Not authorized to delete this session")

        query = text("""
            UPDATE trip_planning_sessions
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = :session_id
            RETURNING id
        """)
        
        result = await db.execute(query, {"session_id": str(session_id)})
        
        if result.rowcount == 0:
             raise HTTPException(status_code=404, detail="Session not found")
        
        await db.commit()
        return {"message": "Session cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
