"""Template Service for managing default package templates"""

from typing import List, Optional
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from app.models import (
    Package, ItineraryItem, UserItinerary, UserItineraryActivity,
    PackageStatus, User
)


class TemplateService:
    """Service for managing package templates"""
    
    def __init__(self, db: Session):
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
        self.db.commit()
        self.db.refresh(template)
        
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
        template = self.db.query(Package).filter(
            Package.id == template_id,
            Package.is_template == True
        ).first()
        
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
        import json
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
        self.db.commit()
        self.db.refresh(itinerary_item)
        
        return itinerary_item
    
    async def get_template_by_destination(
        self,
        destination: str
    ) -> Optional[Package]:
        """Find active template for a destination"""
        
        return self.db.query(Package).filter(
            Package.is_template == True,
            Package.template_destination == destination,
            Package.status == PackageStatus.PUBLISHED
        ).first()
    
    async def get_all_templates(self) -> List[Package]:
        """Get all published templates"""
        
        return self.db.query(Package).filter(
            Package.is_template == True,
            Package.status == PackageStatus.PUBLISHED
        ).all()
    
    async def get_template_activities(
        self,
        template_id: uuid.UUID,
        max_days: Optional[int] = None
    ) -> List[ItineraryItem]:
        """Get all activities for a template, optionally limited by days"""
        
        query = self.db.query(ItineraryItem).filter(
            ItineraryItem.package_id == template_id
        )
        
        if max_days:
            query = query.filter(ItineraryItem.day_number <= max_days)
        
        return query.order_by(
            ItineraryItem.day_number,
            ItineraryItem.display_order
        ).all()
    
    async def update_template_activity(
        self,
        activity_id: uuid.UUID,
        **kwargs
    ) -> ItineraryItem:
        """Update a template activity"""
        
        activity = self.db.query(ItineraryItem).filter(
            ItineraryItem.id == activity_id
        ).first()
        
        if not activity:
            raise ValueError(f"Activity {activity_id} not found")
        
        for key, value in kwargs.items():
            if hasattr(activity, key):
                setattr(activity, key, value)
        
        self.db.commit()
        self.db.refresh(activity)
        
        return activity
    
    async def delete_template_activity(
        self,
        activity_id: uuid.UUID
    ) -> bool:
        """Delete a template activity"""
        
        activity = self.db.query(ItineraryItem).filter(
            ItineraryItem.id == activity_id
        ).first()
        
        if not activity:
            return False
        
        self.db.delete(activity)
        self.db.commit()
        
        return True
