"""Geo resolver service for distance calculations and geocoding"""
from math import radians, sin, cos, sqrt, atan2
from functools import lru_cache
from app.schemas.itinerary_schemas import Location
from app.services.geocoding_service import GeocodingService
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class GeoResolverService:
    """
    Service for geographic operations
    - Distance calculations
    - Geocoding
    """
    
    @staticmethod
    @lru_cache(maxsize=10000)
    def calculate_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            lat1, lon1: First location coordinates
            lat2, lon2: Second location coordinates
            
        Returns:
            Distance in kilometers
        """
        R = 6371  # Earth's radius in km
        
        # Convert to radians
        lat1_rad, lon1_rad = radians(lat1), radians(lon1)
        lat2_rad, lon2_rad = radians(lat2), radians(lon2)
        
        # Differences
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Haversine formula
        a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        distance = R * c
        return round(distance, 2)
    
    @staticmethod
    def calculate_distance_between_locations(loc1: Location, loc2: Location) -> float:
        """
        Calculate distance between two Location objects
        
        Args:
            loc1: First location
            loc2: Second location
            
        Returns:
            Distance in kilometers
        """
        return GeoResolverService.calculate_distance(
            loc1.latitude, loc1.longitude,
            loc2.latitude, loc2.longitude
        )
    
    @staticmethod
    async def geocode_destination(destination: str) -> Location:
        """
        Convert destination name to Location object
        
        Args:
            destination: City or destination name
            
        Returns:
            Location object with coordinates
        """
        try:
            geocoder = GeocodingService(api_key=settings.GEOAPIFY_API_KEY)
            location_data = await geocoder.geocode(destination)
            
            return Location(
                latitude=location_data.latitude,
                longitude=location_data.longitude,
                address=location_data.formatted_address or '',
                city=location_data.city,
                country=location_data.country
            )
        except Exception as e:
            logger.error(f"Geocoding failed for {destination}: {e}")
            raise ValueError(f"Could not geocode destination: {destination}")
