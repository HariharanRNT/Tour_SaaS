"""
Pexels API Service for fetching activity images
"""
import httpx
from typing import List, Optional
from app.config import settings


class PexelsService:
    """Service for fetching images from Pexels API"""
    
    def __init__(self):
        """Initialize Pexels client"""
        self.api_key = settings.PEXELS_API_KEY
        self.base_url = "https://api.pexels.com/v1"
        
    async def search_photos(self, query: str, per_page: int = 3) -> List[str]:
        """
        Search for photos on Pexels
        
        Args:
            query: Search query (e.g., "Bangalore Palace", "Tokyo Tower")
            per_page: Number of results to return (default: 3)
            
        Returns:
            List of image URLs
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "query": query,
                        "per_page": per_page,
                        "orientation": "landscape"
                    },
                    headers={
                        "Authorization": self.api_key
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    photos = data.get("photos", [])
                    
                    # Extract medium-sized image URLs
                    image_urls = [
                        photo["src"]["large"] 
                        for photo in photos 
                        if "src" in photo and "large" in photo["src"]
                    ]
                    
                    return image_urls[:per_page]
                else:
                    print(f"[PexelsService] Error {response.status_code}: {response.text}")
                    return []
                    
        except Exception as e:
            print(f"[PexelsService] Error searching photos: {str(e)}")
            return []
    
    async def get_activity_images(self, activity_title: str, location: str) -> List[str]:
        """
        Get images for a specific activity
        
        Args:
            activity_title: Title of the activity
            location: Location of the activity
            
        Returns:
            List of image URLs
        """
        # Combine location and activity for better search results
        query = f"{location} {activity_title}"
        
        # Try with full query first
        images = await self.search_photos(query, per_page=2)
        
        # If no results, try with just location
        if not images:
            images = await self.search_photos(location, per_page=2)
        
        return images


# Singleton instance
pexels_service = PexelsService()
