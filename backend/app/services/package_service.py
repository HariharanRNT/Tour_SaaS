"""Package Service for managing tour packages with time-slotted itineraries"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from app.models import Package, ItineraryItem, PackageStatus


class PackageService:
    """Service for managing packages with enhanced itinerary support"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_package_with_itinerary(
        self,
        package_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get package with itinerary organized by day and time slot
        Returns package data with nested itinerary structure
        """
        from sqlalchemy import select
        import json
        
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
    
    async def get_packages_by_destination(
        self,
        destination: str,
        limit: int = 10,
        offset: int = 0
    ) -> List[Package]:
        """Get all published packages for a destination"""
        
        # TODO: Add is_template filter after running migrations
        return self.db.query(Package).filter(
            Package.destination.ilike(f"%{destination}%"),
            # Package.is_template == False,  # Disabled until migration is run
            Package.status == PackageStatus.PUBLISHED
        ).offset(offset).limit(limit).all()
    
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
        package = self.db.query(Package).filter(
            Package.id == package_id
        ).first()
        
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        # Validate time slot
        valid_slots = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day']
        if time_slot and time_slot not in valid_slots:
            raise ValueError(f"Time slot must be one of: {', '.join(valid_slots)}")
        
        # Create itinerary item
        import json
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
        self.db.commit()
        self.db.refresh(item)
        
        return item
    
    async def update_itinerary_item(
        self,
        item_id: uuid.UUID,
        **kwargs
    ) -> ItineraryItem:
        """Update an itinerary item"""
        
        item = self.db.query(ItineraryItem).filter(
            ItineraryItem.id == item_id
        ).first()
        
        if not item:
            raise ValueError(f"Itinerary item {item_id} not found")
        
        for key, value in kwargs.items():
            if hasattr(item, key):
                setattr(item, key, value)
        
        self.db.commit()
        self.db.refresh(item)
        
        return item
    
    async def delete_itinerary_item(
        self,
        item_id: uuid.UUID
    ) -> bool:
        """Delete an itinerary item"""
        
        item = self.db.query(ItineraryItem).filter(
            ItineraryItem.id == item_id
        ).first()
        
        if not item:
            return False
        
        self.db.delete(item)
        self.db.commit()
        
        return True
