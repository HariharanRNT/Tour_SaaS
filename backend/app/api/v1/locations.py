from typing import List, Optional
from fastapi import APIRouter, Query
from fastapi_cache.decorator import cache

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
