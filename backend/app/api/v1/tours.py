"""Tours API endpoints - Amadeus integration"""
from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.services.geocoding_service import GeocodingService, LocationData
from app.services.amadeus_adapter import AmadeusAdapter
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/search")
async def search_tours(
    destination: str = Query(..., description="City or destination name (e.g., 'Singapore', 'Paris')"),
    radius: int = Query(50, ge=1, le=100, description="Search radius in kilometers"),
    max_results: int = Query(50, ge=1, le=100, description="Maximum number of results")
):
    """
    Search for tours and activities using Amadeus API
    
    This endpoint:
    1. Geocodes the destination name to lat/long using Geoapify
    2. Searches Amadeus Tours & Activities API
    3. Returns normalized tour packages
    """
    try:
        # Initialize services
        geocoding = GeocodingService(settings.GEOAPIFY_API_KEY)
        amadeus = AmadeusAdapter(
            settings.AMADEUS_CLIENT_ID,
            settings.AMADEUS_CLIENT_SECRET,
            settings.AMADEUS_BASE_URL
        )
        
        # Step 1: Geocode destination
        logger.info(f"Geocoding destination: {destination}")
        try:
            location = await geocoding.geocode(destination)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            raise HTTPException(status_code=500, detail="Failed to geocode destination")
        
        # Step 2: Search Amadeus for activities
        logger.info(f"Searching Amadeus at lat={location.latitude}, lon={location.longitude}")
        try:
            activities = await amadeus.search_activities(
                latitude=location.latitude,
                longitude=location.longitude,
                radius=radius,
                max_results=max_results
            )
        except Exception as e:
            logger.error(f"Amadeus search error: {e}")
            raise HTTPException(status_code=500, detail="Failed to search tours")
        
        # Step 3: Normalize results
        if activities:
            logger.info(f"DEBUG - First activity: {activities[0]}")
        tours = [amadeus.normalize_activity(activity) for activity in activities]
        
        return {
            "success": True,
            "destination": destination,
            "location": {
                "city": location.city,
                "country": location.country,
                "country_code": location.country_code,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "formatted_address": location.formatted_address
            },
            "search_params": {
                "radius_km": radius,
                "max_results": max_results
            },
            "total_results": len(tours),
            "tours": tours,
            "supplier": "amadeus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in search_tours: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/activity/{activity_id}")
async def get_activity_details(activity_id: str):
    """
    Get detailed information for a specific Amadeus activity
    """
    try:
        amadeus = AmadeusAdapter(
            settings.AMADEUS_CLIENT_ID,
            settings.AMADEUS_CLIENT_SECRET,
            settings.AMADEUS_BASE_URL
        )
        
        activity = await amadeus.get_activity_details(activity_id)
        normalized = amadeus.normalize_activity(activity)
        
        return {
            "success": True,
            "activity": normalized
        }
        
    except Exception as e:
        logger.error(f"Error getting activity details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
