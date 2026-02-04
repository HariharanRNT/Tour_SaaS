"""Amadeus Tours & Activities API adapter"""
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class AmadeusAdapter:
    """Adapter for Amadeus Tours & Activities API"""
    
    def __init__(self, client_id: str, client_secret: str, base_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
    
    async def get_access_token(self) -> str:
        """
        Get OAuth2 access token from Amadeus
        Caches token until expiration
        """
        # Return cached token if still valid
        if self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at:
                return self.access_token
        
        # Request new token
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/v1/security/oauth2/token",
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                self.access_token = data['access_token']
                # Token typically expires in 1799 seconds (30 minutes)
                expires_in = data.get('expires_in', 1799)
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)  # 1 min buffer
                
                logger.info("Successfully obtained Amadeus access token")
                return self.access_token
                
            except httpx.HTTPError as e:
                logger.error(f"Failed to get Amadeus access token: {e}")
                raise Exception(f"Amadeus authentication failed: {str(e)}")
    
    async def search_activities(
        self,
        latitude: float,
        longitude: float,
        radius: int = 50,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search for activities near a location
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            radius: Search radius in kilometers (default: 50)
            max_results: Maximum number of results (default: 50)
            
        Returns:
            List of activity dictionaries from Amadeus API
        """
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v1/shopping/activities",
                    params={
                        "latitude": latitude,
                        "longitude": longitude,
                        "radius": radius
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    activities = data.get('data', [])
                    logger.info(f"Found {len(activities)} activities from Amadeus")
                    return activities[:max_results]
                elif response.status_code == 404:
                    logger.warning(f"No activities found at lat={latitude}, lon={longitude}")
                    return []
                else:
                    response.raise_for_status()
                    
            except httpx.HTTPError as e:
                logger.error(f"Amadeus API error: {e}")
                raise Exception(f"Failed to search Amadeus activities: {str(e)}")
    
    def _format_duration(self, duration_str: str) -> str:
        """
        Format ISO 8601 duration string to human-readable format
        
        Args:
            duration_str: ISO 8601 duration (e.g., 'PT2H', 'PT30M', 'PT2H30M')
            
        Returns:
            Human-readable duration (e.g., '2 hours', '30 minutes', '2 hours 30 minutes')
        """
        if not duration_str or duration_str == 'N/A':
            return 'Flexible'
        
        try:
            # Remove 'PT' prefix if present
            duration_str = duration_str.replace('PT', '')
            
            hours = 0
            minutes = 0
            
            # Extract hours
            if 'H' in duration_str:
                hours_str = duration_str.split('H')[0]
                hours = int(hours_str)
                duration_str = duration_str.split('H')[1] if 'H' in duration_str else ''
            
            # Extract minutes
            if 'M' in duration_str:
                minutes_str = duration_str.split('M')[0]
                minutes = int(minutes_str)
            
            # Format output
            parts = []
            if hours > 0:
                parts.append(f"{hours} {'hour' if hours == 1 else 'hours'}")
            if minutes > 0:
                parts.append(f"{minutes} {'minute' if minutes == 1 else 'minutes'}")
            
            return ' '.join(parts) if parts else 'Flexible'
            
        except Exception as e:
            logger.warning(f"Failed to parse duration '{duration_str}': {e}")
            return duration_str  # Return original if parsing fails
    
    def normalize_activity(self, activity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Amadeus activity to our unified format
        
        Args:
            activity: Raw activity data from Amadeus API
            
        Returns:
            Normalized activity dictionary
        """
        try:
            # Extract price information
            price_info = activity.get('price', {})
            price_amount = float(price_info.get('amount', 0))
            currency = price_info.get('currencyCode', 'USD')
            
            # Extract images
            pictures = activity.get('pictures', [])
            images = [pic for pic in pictures if isinstance(pic, str)]
            
            # Extract location
            geo_code = activity.get('geoCode', {})
            
            # Extract rating
            rating_value = activity.get('rating', 0)
            if isinstance(rating_value, str):
                try:
                    rating_value = float(rating_value)
                except:
                    rating_value = 0
            
            # Extract and format duration
            duration_str = activity.get('minimumDuration', activity.get('duration', ''))
            formatted_duration = self._format_duration(duration_str) if duration_str else 'Flexible'
            
            return {
                "id": f"amadeus_{activity['id']}",
                "supplier": "amadeus",
                "title": activity.get('name', 'Untitled Activity'),
                "description": activity.get('shortDescription', ''),
                "price_per_person": Decimal(str(price_amount)),
                "currency": currency,
                "duration": formatted_duration,
                "duration_days": 1,  # Default for activities
                "duration_nights": 0,
                "category": activity.get('category', 'general'),
                "destination": activity.get('destination', ''),
                "rating": float(rating_value),
                "images": images[:5] if images else [],
                "location": {
                    "latitude": geo_code.get('latitude'),
                    "longitude": geo_code.get('longitude')
                },
                "supplier_reference": activity['id'],
                "booking_link": activity.get('bookingLink', ''),
                "max_group_size": 20,  # Default value
                "included_items": [],
                "excluded_items": [],
                "status": "active"
            }
        except Exception as e:
            logger.error(f"Error normalizing Amadeus activity: {e}")
            # Return minimal valid structure
            return {
                "id": f"amadeus_{activity.get('id', 'unknown')}",
                "supplier": "amadeus",
                "title": activity.get('name', 'Activity'),
                "description": "",
                "price_per_person": Decimal("0"),
                "currency": "USD",
                "duration": "Flexible",
                "rating": 0,
                "images": [],
                "supplier_reference": activity.get('id', ''),
                "status": "active"
            }
    
    async def get_activity_details(self, activity_id: str) -> Dict[str, Any]:
        """
        Get detailed information for a specific activity
        
        Args:
            activity_id: Amadeus activity ID
            
        Returns:
            Detailed activity information
        """
        token = await self.get_access_token()
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v1/shopping/activities/{activity_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                return data.get('data', {})
                
            except httpx.HTTPError as e:
                logger.error(f"Failed to get activity details: {e}")
                raise Exception(f"Failed to get activity details: {str(e)}")
