"""Package Service for managing tour packages with time-slotted itineraries"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import json

from app.models import Package, ItineraryItem, PackageStatus


class PackageService:
    """Service for managing packages with enhanced itinerary support"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_package_with_itinerary(
        self,
        package_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get package with itinerary organized by day and time slot
        Returns package data with nested itinerary structure
        """
        
        # Get package using async query
        stmt = select(Package).where(Package.id == package_id)
        result = await self.db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        # Get itinerary items using async query
        stmt = select(ItineraryItem).where(
            ItineraryItem.package_id == package_id
        ).order_by(
            ItineraryItem.day_number,
            ItineraryItem.display_order
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        
        # Organize by day and time slot
        itinerary_by_day = {}
        for item in items:
            day = item.day_number
            # Ensure slot exists in dictionary
            slot = item.time_slot or 'unassigned'
            if slot not in ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day']:
                slot = 'unassigned'
            
            if day not in itinerary_by_day:
                itinerary_by_day[day] = {
                    'day_number': day,
                    'morning': [],
                    'afternoon': [],
                    'evening': [],
                    'night': [],
                    'full_day': [],
                    'half_day': [],
                    'unassigned': []
                }
            
            # Parse activities JSON string
            try:
                activities_list = json.loads(item.activities) if item.activities else []
            except:
                activities_list = []

            # Handle image_url which might be a JSON list
            final_image_url = item.image_url
            images_list = []
            
            if item.image_url and isinstance(item.image_url, str):
                cleaned_url = item.image_url.strip()
                if cleaned_url.startswith('[') or cleaned_url.startswith('{'):
                    try:
                        parsed_images = json.loads(cleaned_url)
                        if isinstance(parsed_images, list):
                            images_list = parsed_images
                            if len(parsed_images) > 0:
                                final_image_url = parsed_images[0]
                            else:
                                final_image_url = None
                    except:
                        # If parsing fails, treat as raw string if it looks like a url
                        pass
                else:
                    # It's a single string URL
                    images_list = [cleaned_url]

            itinerary_by_day[day][slot].append({
                'id': str(item.id),
                'day_number': item.day_number,
                'title': item.title,
                'description': item.description,
                'image_url': final_image_url,
                'images': images_list,
                'activities': activities_list,
                'meals_included': item.meals_included,
                'time_slot': item.time_slot,
                'display_order': item.display_order
            })
        
        # Convert to list sorted by day
        itinerary_list = [itinerary_by_day[day] for day in sorted(itinerary_by_day.keys())]
        
        return {
            'package': package,
            'itinerary_by_day': itinerary_list
        }

    async def get_package_with_itinerary_by_slug(
        self,
        slug: str
    ) -> Dict[str, Any]:
        """
        Get package with itinerary organized by day and time slot by slug
        """
        
        # Get package using async query
        stmt = select(Package).where(Package.slug == slug)
        result = await self.db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise ValueError(f"Package with slug {slug} not found")
        
        # We can just reuse get_package_with_itinerary logic now that we have the package_id
        return await self.get_package_with_itinerary(package.id)
    
    async def get_packages_by_destination(
        self,
        destination: str,
        limit: int = 10,
        offset: int = 0
    ) -> List[Package]:
        """Get all published packages for a destination"""
        
        stmt = select(Package).where(
            Package.destination.ilike(f"%{destination}%"),
            Package.status == PackageStatus.PUBLISHED
        ).offset(offset).limit(limit)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def add_itinerary_item_with_timeslot(
        self,
        package_id: uuid.UUID,
        day_number: int,
        time_slot: str,
        title: str,
        description: str,
        activities: List[str] = None,
        display_order: int = 0
    ) -> ItineraryItem:
        """Add an itinerary item with time slot to a package"""
        
        # Validate package exists
        stmt = select(Package).where(Package.id == package_id)
        result = await self.db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        # Validate time slot
        valid_slots = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day']
        if time_slot and time_slot not in valid_slots:
            raise ValueError(f"Time slot must be one of: {', '.join(valid_slots)}")
        
        # Create itinerary item
        item = ItineraryItem(
            package_id=package_id,
            day_number=day_number,
            title=title,
            description=description,
            activities=json.dumps(activities or []),
            time_slot=time_slot,
            display_order=display_order
        )
        
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        
        return item
    
    async def update_itinerary_item(
        self,
        item_id: uuid.UUID,
        **kwargs
    ) -> ItineraryItem:
        """Update an itinerary item"""
        
        stmt = select(ItineraryItem).where(ItineraryItem.id == item_id)
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            raise ValueError(f"Itinerary item {item_id} not found")
        
        for key, value in kwargs.items():
            if hasattr(item, key):
                if key == 'activities' and value is not None:
                     setattr(item, key, json.dumps(value))
                else:
                     setattr(item, key, value)
        
        await self.db.commit()
        await self.db.refresh(item)
        
        return item
    
    async def delete_itinerary_item(
        self,
        item_id: uuid.UUID
    ) -> bool:
        """Delete an itinerary item"""
        
        stmt = select(ItineraryItem).where(ItineraryItem.id == item_id)
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            return False
        
        await self.db.delete(item)
        await self.db.commit()
        
        return True
