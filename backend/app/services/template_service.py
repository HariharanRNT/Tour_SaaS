"""Template Service for managing default package templates"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import json

from app.models import (
    Package, ItineraryItem, UserItinerary, UserItineraryActivity,
    PackageStatus, User
)


class TemplateService:
    """Service for managing package templates"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_template(
        self,
        title: str,
        destination: str,
        max_days: int,
        description: str,
        created_by: uuid.UUID
    ) -> Package:
        """Create a new package template"""
        
        # Generate slug from title
        slug = title.lower().replace(" ", "-").replace("template", "tmpl")
        
        template = Package(
            title=title,
            slug=slug,
            description=description,
            destination=destination,
            duration_days=max_days,
            duration_nights=max_days - 1,
            price_per_person=0,  # Templates don't have fixed price
            is_template=True,
            template_destination=destination,
            template_max_days=max_days,
            status=PackageStatus.PUBLISHED,
            created_by=created_by
        )
        
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        
        return template
    
    async def add_activity_to_template(
        self,
        template_id: uuid.UUID,
        day_number: int,
        time_slot: str,
        title: str,
        description: str,
        activities: List[str] = None,
        display_order: int = 0
    ) -> ItineraryItem:
        """Add an activity to a specific day and time slot in template"""
        
        # Validate template exists
        stmt = select(Package).where(
            Package.id == template_id,
            Package.is_template == True
        )
        result = await self.db.execute(stmt)
        template = result.scalar_one_or_none()
        
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Validate day number
        if day_number < 1 or day_number > template.template_max_days:
            raise ValueError(f"Day number must be between 1 and {template.template_max_days}")
        
        # Validate time slot
        valid_slots = ['morning', 'afternoon', 'evening', 'night', 'full_day']
        if time_slot not in valid_slots:
            raise ValueError(f"Time slot must be one of: {', '.join(valid_slots)}")
        
        # Create itinerary item
        itinerary_item = ItineraryItem(
            package_id=template_id,
            day_number=day_number,
            title=title,
            description=description,
            activities=json.dumps(activities or []),
            time_slot=time_slot,
            display_order=display_order
        )
        
        self.db.add(itinerary_item)
        await self.db.commit()
        await self.db.refresh(itinerary_item)
        
        return itinerary_item
    
    async def get_template_by_destination(
        self,
        destination: str
    ) -> Optional[Package]:
        """Find active template for a destination"""
        
        stmt = select(Package).where(
            Package.is_template == True,
            Package.template_destination == destination,
            Package.status == PackageStatus.PUBLISHED
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_all_templates(self) -> List[Package]:
        """Get all published templates"""
        
        stmt = select(Package).where(
            Package.is_template == True,
            Package.status == PackageStatus.PUBLISHED
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_template_activities(
        self,
        template_id: uuid.UUID,
        max_days: Optional[int] = None
    ) -> List[ItineraryItem]:
        """Get all activities for a template, optionally limited by days"""
        
        stmt = select(ItineraryItem).where(
            ItineraryItem.package_id == template_id
        )
        
        if max_days:
            stmt = stmt.where(ItineraryItem.day_number <= max_days)
        
        stmt = stmt.order_by(
            ItineraryItem.day_number,
            ItineraryItem.display_order
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def update_template_activity(
        self,
        activity_id: uuid.UUID,
        **kwargs
    ) -> ItineraryItem:
        """Update a template activity"""
        
        stmt = select(ItineraryItem).where(
            ItineraryItem.id == activity_id
        )
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        
        if not activity:
            raise ValueError(f"Activity {activity_id} not found")
        
        for key, value in kwargs.items():
            if hasattr(activity, key):
                setattr(activity, key, value)
        
        await self.db.commit()
        await self.db.refresh(activity)
        
        return activity
    
    async def delete_template_activity(
        self,
        activity_id: uuid.UUID
    ) -> bool:
        """Delete a template activity"""
        
        stmt = select(ItineraryItem).where(
            ItineraryItem.id == activity_id
        )
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        
        if not activity:
            return False
        
        await self.db.delete(activity)
        await self.db.commit()
        
        return True
