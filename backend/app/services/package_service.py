"""Package Service for managing tour packages with time-slotted itineraries"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import json
import re

from app.models import Package, ItineraryItem, PackageStatus


class PackageService:
    """Service for managing packages with enhanced itinerary support"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def generate_slug(name: str, package_id: Optional[uuid.UUID] = None) -> str:
        """
        Generate a clean, SEO-friendly slug from the full package name or custom slug base.
        Be lowercase, Replace spaces with -, Remove special characters, Append ID suffix.
        """
        if not name:
            return ""
            
        # 1. Lowercase and trim
        slug = name.lower().strip()
        # 2. Replace & with and
        slug = slug.replace('&', 'and')
        
        # If it's already a slug with an ID suffix at the end, try to strip it first
        # so we don't double-append (e.g. from a manual edit that kept the suffix)
        if package_id:
            suffix = str(package_id)[:8]
            if slug.endswith(f"-{suffix}"):
                slug = slug[:-(len(suffix) + 1)]

        # 3. Remove special characters (keep a-z0-9, spaces, hyphens)
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        # 4. Replace spaces with -
        slug = re.sub(r'\s+', '-', slug)
        # 5. Avoid multiple hyphens
        slug = re.sub(r'-+', '-', slug)
        # 6. Trim trailing/leading hyphens
        slug = slug.strip('-')
        
        # Append unique package ID at the end of slug if provided
        if package_id:
            suffix = str(package_id)[:8]
            slug = f"{slug}-{suffix}"
            
        return slug
    
    async def get_package_with_itinerary(
        self,
        package_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get package with itinerary organized by day and time slot
        Returns package data with nested itinerary structure
        """
        
        # Get package using async query with destination metadata
        from sqlalchemy.orm import selectinload
        stmt = select(Package).options(selectinload(Package.dest_metadata)).where(Package.id == package_id)
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
                'start_time': item.start_time,
                'end_time': item.end_time,
                'display_order': item.display_order
            })
        
        # Convert to list sorted by day
        itinerary_list = [itinerary_by_day[day] for day in sorted(itinerary_by_day.keys())]
        
        # Fetch creator agent to resolve GST defaults
        from app.models import Agent
        agent_stmt = select(Agent).where(Agent.user_id == package.created_by)
        agent_res = await self.db.execute(agent_stmt)
        agent = agent_res.scalar_one_or_none()

        effective_gst_applicable = package.gst_applicable
        effective_gst_mode = package.gst_mode
        effective_gst_percentage = package.gst_percentage

        # Fallback to agent defaults if package-level fields are None
        if agent:
            if effective_gst_applicable is None:
                effective_gst_applicable = agent.gst_applicable
            
            if effective_gst_applicable:
                if effective_gst_mode is None:
                    effective_gst_mode = 'inclusive' if agent.gst_inclusive else 'exclusive'
                if effective_gst_percentage is None:
                    effective_gst_percentage = agent.gst_percentage

        # Ensure consistent values if GST is off
        if not effective_gst_applicable:
            effective_gst_mode = 'inclusive'
            effective_gst_percentage = 0

        return {
            'package': package,
            'gst_applicable': effective_gst_applicable,
            'gst_mode': effective_gst_mode,
            'gst_percentage': effective_gst_percentage,
            'feature_image_url': package.feature_image_url,
            'destination_image_url': package.destination_image_url,
            'itinerary_by_day': itinerary_list,
            'agent': agent # Include agent for homepage settings fetch in API route
        }

    async def get_package_with_itinerary_by_slug(
        self,
        slug: str
    ) -> Dict[str, Any]:
        """
        Get package with itinerary organized by day and time slot by slug
        """
        # 1. Try exact match
        stmt = select(Package).where(Package.slug == slug)
        result = await self.db.execute(stmt)
        package = result.scalar_one_or_none()
        
        # 2. Fallback using ID extraction (e.g. from chennai-heritage-f6863324, extract f6863324)
        if not package and '-' in slug:
            print(f"DEBUG SLUG: Exact match failed for '{slug}', trying ID fallback...")
            suffix = slug.split('-')[-1]
            # Suffix should be hex (part of uuid)
            if len(suffix) >= 4 and all(c in '0123456789abcdef' for c in suffix.lower()):
                 from sqlalchemy import cast, String
                 # Search for package where ID starts with the extracted suffix
                 stmt = select(Package).where(cast(Package.id, String).startswith(suffix.lower()))
                 result = await self.db.execute(stmt)
                 package = result.scalar_one_or_none()
                 if package:
                     print(f"DEBUG SLUG: Fallback successful! Found package: {package.title} ({package.id})")
        
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
