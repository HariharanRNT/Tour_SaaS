"""Flight search API endpoints"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.config import settings
from app.services.tripjack_adapter import TripJackAdapter

router = APIRouter(prefix="/flights", tags=["flights"])
logger = logging.getLogger(__name__)

# Initialize TripJack adapter
tripjack = TripJackAdapter(
    api_key=settings.TRIPJACK_API_KEY,
    base_url=settings.TRIPJACK_BASE_URL
)


@router.get("/search")
async def search_flights(
    origin: str = Query(..., description="Origin airport/city code (e.g., MAA)"),
    destination: str = Query(..., description="Destination airport/city code (e.g., DEL)"),
    departure_date: str = Query(..., description="Departure date (YYYY-MM-DD)"),
    return_date: Optional[str] = Query(None, description="Return date for round-trip (YYYY-MM-DD)"),
    adults: int = Query(1, ge=1, le=9, description="Number of adult passengers"),
    children: int = Query(0, ge=0, le=9, description="Number of child passengers"),
    infants: int = Query(0, ge=0, le=9, description="Number of infant passengers"),
    cabin_class: str = Query("ECONOMY", description="Cabin class (ECONOMY, BUSINESS, FIRST)"),
    is_direct_flight: bool = Query(True, description="Filter for direct flights")
):
    """
    Search for flights using TripJack API
    
    Returns:
        List of available flight options with pricing and details
    """
    try:
        logger.info(f"Flight search request: {origin} -> {destination} on {departure_date}")
        
        # Validate cabin class
        valid_classes = ["ECONOMY", "BUSINESS", "FIRST"]
        if cabin_class.upper() not in valid_classes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid cabin class. Must be one of: {', '.join(valid_classes)}"
            )
        
        # Search flights
        flights = await tripjack.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            adults=adults,
            children=children,
            infants=infants,
            cabin_class=cabin_class,
            is_direct_flight=is_direct_flight
        )
        
        # Determine trip type
        trip_type = "round-trip" if return_date else "one-way"
        
        return {
            "success": True,
            "trip_type": trip_type,
            "search_params": {
                "origin": origin.upper(),
                "destination": destination.upper(),
                "departure_date": departure_date,
                "return_date": return_date,
                "passengers": {
                    "adults": adults,
                    "children": children,
                    "infants": infants,
                    "total": adults + children + infants
                },
                "cabin_class": cabin_class.upper()
            },
            "total_results": len(flights),
            "flights": flights,
            "currency": "INR"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flight search error: {e}")
        # DEBUG: Include masked key to verify what's loaded
        mask_key = "None"
        if tripjack.api_key:
            k = tripjack.api_key
            mask_key = f"{k[:5]}...{k[-5:]}" if len(k) > 10 else "SHORT_KEY"
            
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search flights. Key: {mask_key}. Error: {str(e)}"
        )


@router.get("/airports/search")
async def search_airports(
    query: str = Query(..., min_length=2, description="Airport name or city to search")
):
    """
    Search for airports by name or city
    
    Note: This is a placeholder. In production, integrate with airport database.
    """
    # Common airports for testing
    airports = [
        {"code": "MAA", "name": "Chennai International Airport", "city": "Chennai", "country": "India"},
        {"code": "DEL", "name": "Indira Gandhi International Airport", "city": "Delhi", "country": "India"},
        {"code": "BOM", "name": "Chhatrapati Shivaji Maharaj International Airport", "city": "Mumbai", "country": "India"},
        {"code": "BLR", "name": "Kempegowda International Airport", "city": "Bangalore", "country": "India"},
        {"code": "HYD", "name": "Rajiv Gandhi International Airport", "city": "Hyderabad", "country": "India"},
        {"code": "CCU", "name": "Netaji Subhas Chandra Bose International Airport", "city": "Kolkata", "country": "India"},
        {"code": "GOI", "name": "Goa International Airport", "city": "Goa", "country": "India"},
        {"code": "JFK", "name": "John F. Kennedy International Airport", "city": "New York", "country": "USA"},
        {"code": "LHR", "name": "London Heathrow Airport", "city": "London", "country": "UK"},
        {"code": "DXB", "name": "Dubai International Airport", "city": "Dubai", "country": "UAE"},
        {"code": "SIN", "name": "Singapore Changi Airport", "city": "Singapore", "country": "Singapore"},
        {"code": "CDG", "name": "Charles de Gaulle Airport", "city": "Paris", "country": "France"},
    ]
    
    # Filter airports based on query
    query_lower = query.lower()
    filtered = [
        airport for airport in airports
        if query_lower in airport["name"].lower() 
        or query_lower in airport["city"].lower()
        or query_lower in airport["code"].lower()
    ]
    
    return {
        "success": True,
        "query": query,
        "results": filtered[:10]  # Limit to 10 results
    }
