"""User Itinerary Service for creating and managing user itineraries from templates"""

from typing import List, Optional, Dict, Any
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import uuid
import json

from app.models import (
    Package, ItineraryItem, UserItinerary, UserItineraryActivity, User
)
from app.services.template_service import TemplateService


class UserItineraryService:
    """Service for managing user itineraries created from templates"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.template_service = TemplateService(db)
    
    async def create_from_template(
        self,
        user_id: uuid.UUID,
        destination: str,
        num_days: int,
        start_date: Optional[date] = None
    ) -> UserItinerary:
        """
        Create a user itinerary from a template
        Auto-populates with template activities
        """
        
        # Find template for destination
        template = await self.template_service.get_template_by_destination(destination)
        
        if not template:
            raise ValueError(f"No template found for destination: {destination}")
        
        # Limit days to template max
        actual_days = min(num_days, template.template_max_days)
        
        # Calculate end date if start date provided
        end_date = None
        if start_date:
            end_date = start_date + timedelta(days=actual_days - 1)
        
        # Create user itinerary
        user_itinerary = UserItinerary(
            user_id=user_id,
            template_package_id=template.id,
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            num_days=actual_days,
            status='draft'
        )
        
        self.db.add(user_itinerary)
        await self.db.flush()  # Get the ID without committing
        
        # Copy template activities to user itinerary
        template_activities = await self.template_service.get_template_activities(
            template.id,
            max_days=actual_days
        )
        
        for template_item in template_activities:
            user_activity = UserItineraryActivity(
                user_itinerary_id=user_itinerary.id,
                day_number=template_item.day_number,
                time_slot=template_item.time_slot,
                activity_id=str(template_item.id),
                activity_title=template_item.title,
                activity_description=template_item.description,
                is_from_template=True,
                display_order=template_item.display_order
            )
            self.db.add(user_activity)
        
        await self.db.commit()
        await self.db.refresh(user_itinerary)
        
        return user_itinerary
    
    async def get_user_itinerary(
        self,
        itinerary_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None
    ) -> Optional[UserItinerary]:
        """Get a user itinerary by ID, optionally filtered by user"""
        
        stmt = select(UserItinerary).where(
            UserItinerary.id == itinerary_id
        )
        
        if user_id:
            stmt = stmt.where(UserItinerary.user_id == user_id)
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_itineraries(
        self,
        user_id: uuid.UUID,
        status: Optional[str] = None
    ) -> List[UserItinerary]:
        """Get all itineraries for a user"""
        
        stmt = select(UserItinerary).where(
            UserItinerary.user_id == user_id
        )
        
        if status:
            stmt = stmt.where(UserItinerary.status == status)
        
        stmt = stmt.order_by(UserItinerary.created_at.desc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_itinerary_activities(
        self,
        itinerary_id: uuid.UUID
    ) -> Dict[int, Dict[str, List[UserItineraryActivity]]]:
        """
        Get activities organized by day and time slot
        Returns: {day_number: {time_slot: [activities]}}
        """
        
        stmt = select(UserItineraryActivity).where(
            UserItineraryActivity.user_itinerary_id == itinerary_id
        ).order_by(
            UserItineraryActivity.day_number,
            UserItineraryActivity.display_order
        )
        
        result = await self.db.execute(stmt)
        activities = result.scalars().all()
        
        # Organize by day and time slot
        organized = {}
        for activity in activities:
            day = activity.day_number
            slot = activity.time_slot
            
            if day not in organized:
                organized[day] = {}
            if slot not in organized[day]:
                organized[day][slot] = []
            
            organized[day][slot].append(activity)
        
        return organized
    
    async def add_custom_activity(
        self,
        itinerary_id: uuid.UUID,
        day_number: int,
        time_slot: str,
        activity_data: Dict[str, Any]
    ) -> UserItineraryActivity:
        """Add a custom activity to user's itinerary"""
        
        # Validate itinerary exists
        itinerary = await self.get_user_itinerary(itinerary_id)
        if not itinerary:
            raise ValueError(f"Itinerary {itinerary_id} not found")
        
        # Validate day number
        if day_number < 1 or day_number > itinerary.num_days:
            raise ValueError(f"Day number must be between 1 and {itinerary.num_days}")
        
        # Create custom activity
        user_activity = UserItineraryActivity(
            user_itinerary_id=itinerary_id,
            day_number=day_number,
            time_slot=time_slot,
            activity_id=activity_data.get('id'),
            activity_title=activity_data.get('title', 'Custom Activity'),
            activity_description=activity_data.get('description'),
            activity_price=activity_data.get('price'),
            activity_duration=activity_data.get('duration'),
            activity_images=activity_data.get('images', []),
            is_from_template=False,
            display_order=activity_data.get('display_order', 0)
        )
        
        self.db.add(user_activity)
        await self.db.commit()
        await self.db.refresh(user_activity)
        
        return user_activity
    
    async def remove_activity(
        self,
        activity_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Remove an activity from user's itinerary"""
        
        stmt = select(UserItineraryActivity).where(
            UserItineraryActivity.id == activity_id
        )
        
        # Optionally verify user ownership
        if user_id:
            stmt = stmt.join(UserItinerary).where(
                UserItinerary.user_id == user_id
            )
        
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        
        if not activity:
            return False
        
        await self.db.delete(activity)
        await self.db.commit()
        
        return True
    
    async def update_itinerary_status(
        self,
        itinerary_id: uuid.UUID,
        status: str
    ) -> UserItinerary:
        """Update itinerary status (draft -> confirmed -> booked)"""
        
        itinerary = await self.get_user_itinerary(itinerary_id)
        if not itinerary:
            raise ValueError(f"Itinerary {itinerary_id} not found")
        
        itinerary.status = status
        await self.db.commit()
        await self.db.refresh(itinerary)
        
        return itinerary
    
    async def calculate_total_cost(
        self,
        itinerary_id: uuid.UUID
    ) -> float:
        """Calculate total cost of all activities in itinerary"""
        
        stmt = select(UserItineraryActivity).where(
            UserItineraryActivity.user_itinerary_id == itinerary_id,
            UserItineraryActivity.activity_price.isnot(None)
        )
        
        result = await self.db.execute(stmt)
        activities = result.scalars().all()
        
        total = sum(float(activity.activity_price or 0) for activity in activities)
        return total
