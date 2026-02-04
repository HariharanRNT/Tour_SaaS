"""API endpoints for enhanced package management"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user, get_optional_current_user, get_current_domain
from app.models import User, UserRole, Agent
from app.services.package_service import PackageService
from app.schemas.package_schemas import (
    PackageWithItineraryResponse,
    ItineraryItemCreate,
    ItineraryItemUpdate,
    PackageItineraryItemResponse
)


router = APIRouter(prefix="/packages", tags=["Packages - Enhanced"])


@router.get("/search", response_model=List[dict])
async def search_packages_by_destination(
    destination: str,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """Search packages by destination"""
    try:
        # Debug logging - RE-ENABLE
        print(f"DEBUG SEARCH: Destination={destination}, Current User={current_user}")
        if current_user:
            print(f"DEBUG SEARCH: User Role={current_user.role}, Agent ID={current_user.agent_id}")
        else:
            print("DEBUG SEARCH: Current User is NONE")

        # Async query for packages
        from app.models import Package, PackageStatus
        from sqlalchemy import select, or_
        
        stmt = select(Package).where(
            Package.status == PackageStatus.PUBLISHED,
            Package.is_public == True,
            or_(
                Package.destination.ilike(f"%{destination}%"),
                Package.country.ilike(f"%{destination}%")
            )
        )

        # Restrict packages for Agent's Context
        if current_user and current_user.agent_id:
             print(f"DEBUG SEARCH: Filtering by LOGGED IN Agent ID: {current_user.agent_id}")
             stmt = stmt.where(Package.created_by == current_user.agent_id)
        elif domain and domain != 'localhost':
             # Find Agent by domain if not logged in
             agent_subquery = select(Agent.user_id).where(Agent.domain == domain).scalar_subquery()
             print(f"DEBUG SEARCH: Filtering by Domain Agent: {domain}")
             stmt = stmt.where(Package.created_by == agent_subquery)
        else:
             print("DEBUG SEARCH: No tenant filtering applied (Localhost or Global Admin)")

        stmt = stmt.offset(offset).limit(limit)
        
        result = await db.execute(stmt)
        packages = result.scalars().all()
        print(f"DEBUG SEARCH: Found {len(packages)} packages")
        
        # Return simple data
        response = []
        
        for p in packages:
            response.append({
                'id': str(p.id),
                'title': p.title,
                'destination': p.destination,
                'duration_days': p.duration_days,
                'price_per_person': float(p.price_per_person),
                'description': p.description
            })
        
        return response
    except Exception as e:
        # Log the error
        import traceback
        print(f"Error in search: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/{package_id}/itinerary", response_model=PackageWithItineraryResponse)
async def get_package_with_itinerary(
    package_id: UUID,
    db: Session = Depends(get_db)
):
    """Get package with day-wise time-slotted itinerary"""
    service = PackageService(db)
    
    try:
        result = await service.get_package_with_itinerary(package_id)
        return {
            **result['package'].__dict__,
            'itinerary_by_day': result['itinerary_by_day']
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{package_id}/itinerary-items", response_model=PackageItineraryItemResponse)
async def add_itinerary_item(
    package_id: UUID,
    item_data: ItineraryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add itinerary item with time slot to package (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    service = PackageService(db)
    
    try:
        item = await service.add_itinerary_item_with_timeslot(
            package_id=package_id,
            day_number=item_data.day_number,
            time_slot=item_data.time_slot,
            title=item_data.title,
            description=item_data.description,
            activities=item_data.activities,
            display_order=item_data.display_order
        )
        return item
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/itinerary-items/{item_id}", response_model=PackageItineraryItemResponse)
async def update_itinerary_item(
    item_id: UUID,
    item_data: ItineraryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update itinerary item (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    service = PackageService(db)
    
    try:
        update_data = {k: v for k, v in item_data.dict().items() if v is not None}
        item = await service.update_itinerary_item(item_id, **update_data)
        return item
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/itinerary-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete itinerary item (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    service = PackageService(db)
    
    success = await service.delete_itinerary_item(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary item not found"
        )
    
    return None
