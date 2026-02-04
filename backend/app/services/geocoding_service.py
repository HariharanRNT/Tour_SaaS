"""Geocoding service using Geoapify API"""
import httpx
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class LocationData:
    """Unified location data structure"""
    destination_name: str
    latitude: float
    longitude: float
    city: str
    country: str
    country_code: str
    formatted_address: Optional[str] = None


class GeocodingService:
    """Service for geocoding destination names to coordinates"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.geoapify.com/v1/geocode"
    
    async def geocode(self, destination: str) -> LocationData:
        """
        Convert destination name to geographic coordinates
        
        Args:
            destination: City name, landmark, or address
            
        Returns:
            LocationData with coordinates and location info
            
        Raises:
            ValueError: If location not found
            httpx.HTTPError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "text": destination,
                        "apiKey": self.api_key,
                        "limit": 1,
                        "format": "json"
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if not data.get('results') or len(data['results']) == 0:
                    raise ValueError(f"Location not found: {destination}")
                
                result = data['results'][0]
                
                return LocationData(
                    destination_name=destination,
                    latitude=result['lat'],
                    longitude=result['lon'],
                    city=result.get('city', result.get('county', '')),
                    country=result.get('country', ''),
                    country_code=result.get('country_code', '').upper(),
                    formatted_address=result.get('formatted', '')
                )
                
            except httpx.HTTPError as e:
                logger.error(f"Geocoding API error: {e}")
                raise
            except (KeyError, IndexError) as e:
                logger.error(f"Error parsing geocoding response: {e}")
                raise ValueError(f"Invalid geocoding response for: {destination}")
