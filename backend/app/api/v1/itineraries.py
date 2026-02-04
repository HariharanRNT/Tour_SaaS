"""API endpoints for itinerary planning with cart persistence"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

# Import from schemas directory
from app.schemas.enums import ActivityType, TimeSlot, PhysicalIntensity, Category
from app.schemas.itinerary_schemas import (
    ItineraryCreateRequest, ItineraryResponse, Itinerary,
    MoveActivityRequest, AddActivityRequest
)
from app.services.itinerary_engine import ItineraryPlanningEngine
from app.services.cart_manager import CartManager
from app.api.dependencies import get_current_user, get_db
from app.models import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/create", response_model=ItineraryResponse)
async def create_itinerary(
    request: ItineraryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new itinerary and save to cart
    
    Request:
    {
        "destination": "Singapore",
        "start_date": "2026-03-15",
        "end_date": "2026-03-18",
        "preferences": {}
    }
    
    Response:
    {
        "success": true,
        "itinerary": {...},
        "message": "Created itinerary with 4 days",
        "cart_id": "uuid"
    }
    """
    try:
        # Create itinerary
        engine = ItineraryPlanningEngine()
        itinerary = await engine.create_itinerary(
            user_id=str(current_user.id),
            request=request
        )
        
        # Save to cart
        cart = await CartManager.save_cart(db, itinerary)
        
        logger.info(f"Created itinerary {itinerary.itinerary_id} for user {current_user.id}")
        
        return {
            "success": True,
            "itinerary": itinerary,
            "message": f"Created itinerary with {len(itinerary.days)} days, {sum(d.total_activities for d in itinerary.days)} activities assigned",
            "cart_id": str(cart.id)
        }
    except Exception as e:
        logger.error(f"Error creating itinerary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cart_id}", response_model=ItineraryResponse)
async def get_itinerary(
    cart_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get itinerary from cart"""
    try:
        cart = await CartManager.get_cart(db, cart_id, str(current_user.id))
        
        if not cart:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        if not cart.is_active:
            raise HTTPException(
                status_code=400, 
                detail=f"Itinerary is {cart.status}"
            )
        
        itinerary = CartManager.cart_to_itinerary(cart)
        
        return {
            "success": True,
            "itinerary": itinerary,
            "cart_id": str(cart.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving itinerary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=dict)
async def list_user_itineraries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all active itineraries for current user"""
    try:
        carts = await CartManager.get_user_carts(db, str(current_user.id))
        
        itineraries = []
        for cart in carts:
            itinerary = CartManager.cart_to_itinerary(cart)
            itineraries.append({
                "cart_id": str(cart.id),
                "destination": cart.destination,
                "start_date": cart.start_date,
                "end_date": cart.end_date,
                "total_days": cart.total_days,
                "total_price": cart.total_price,
                "currency": cart.currency,
                "status": cart.status,
                "created_at": cart.created_at.isoformat(),
                "expires_at": cart.expires_at.isoformat()
            })
        
        return {
            "success": True,
            "itineraries": itineraries,
            "count": len(itineraries)
        }
    except Exception as e:
        logger.error(f"Error listing itineraries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{cart_id}/move-activity", response_model=ItineraryResponse)
async def move_activity(
    cart_id: str,
    request: MoveActivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Move activity between days/slots
    
    Request:
    {
        "activity_id": "amadeus_123",
        "from_day": 1,
        "to_day": 3,
        "to_slot": "MORNING"
    }
    """
    try:
        # Get cart
        cart = await CartManager.get_cart(db, cart_id, str(current_user.id))
        
        if not cart:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        if not cart.is_active:
            raise HTTPException(status_code=400, detail=f"Itinerary is {cart.status}")
        
        # Get itinerary
        itinerary = CartManager.cart_to_itinerary(cart)
        
        # Move activity
        engine = ItineraryPlanningEngine()
        updated_itinerary = await engine.move_activity(itinerary, request)
        
        # Update cart
        await CartManager.update_cart(db, cart_id, updated_itinerary, str(current_user.id))
        
        return {
            "success": True,
            "itinerary": updated_itinerary,
            "message": "Activity moved successfully",
            "cart_id": cart_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{cart_id}/add-activity", response_model=ItineraryResponse)
async def add_activity(
    cart_id: str,
    request: AddActivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add new activity to itinerary
    
    Request:
    {
        "activity_id": "amadeus_456",
        "day_number": 2,
        "time_slot": "EVENING"
    }
    """
    try:
        # Get cart
        cart = await CartManager.get_cart(db, cart_id, str(current_user.id))
        
        if not cart:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        if not cart.is_active:
            raise HTTPException(status_code=400, detail=f"Itinerary is {cart.status}")
        
        # Get itinerary
        itinerary = CartManager.cart_to_itinerary(cart)
        
        # Add activity
        engine = ItineraryPlanningEngine()
        updated_itinerary = await engine.add_activity(itinerary, request)
        
        # Update cart
        await CartManager.update_cart(db, cart_id, updated_itinerary, str(current_user.id))
        
        return {
            "success": True,
            "itinerary": updated_itinerary,
            "message": "Activity added successfully",
            "cart_id": cart_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cart_id}/remove-activity")
async def remove_activity(
    cart_id: str,
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove activity from itinerary"""
    try:
        # Get cart
        cart = await CartManager.get_cart(db, cart_id, str(current_user.id))
        
        if not cart:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        if not cart.is_active:
            raise HTTPException(status_code=400, detail=f"Itinerary is {cart.status}")
        
        # Get itinerary
        itinerary = CartManager.cart_to_itinerary(cart)
        
        # Remove activity
        engine = ItineraryPlanningEngine()
        updated_itinerary = await engine.remove_activity(itinerary, activity_id)
        
        # Update cart
        await CartManager.update_cart(db, cart_id, updated_itinerary, str(current_user.id))
        
        return {
            "success": True,
            "message": "Activity removed successfully",
            "cart_id": cart_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cart_id}")
async def delete_itinerary(
    cart_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete itinerary cart"""
    try:
        deleted = await CartManager.delete_cart(db, cart_id, str(current_user.id))
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        return {
            "success": True,
            "message": "Itinerary deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting itinerary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
