"""Main itinerary planning engine - orchestrates the entire flow"""
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging
from app.schemas.itinerary_schemas import (
    NormalizedActivity, DayPlan, DaySlot, Itinerary,
    ItineraryCreateRequest, MoveActivityRequest, AddActivityRequest
)
from app.schemas.enums import TimeSlot, ActivityType
from app.services.amadeus_adapter import AmadeusAdapter
from app.adapters.amadeus_activity_adapter import AmadeusActivityAdapter
from app.services.assignment_engine import ItineraryAssignmentEngine, AssignmentRules
from app.services.geo_resolver import GeoResolverService
from app.config import settings

logger = logging.getLogger(__name__)


class ItineraryPlanningEngine:
    """
    Main orchestrator for itinerary planning
    
    Responsibilities:
    - Fetch activities from suppliers
    - Normalize activities
    - Create day skeleton
    - Assign activities to days
    - Handle user modifications (move, add, remove)
    """
    
    def __init__(self):
        self.amadeus_api = AmadeusAdapter(
            settings.AMADEUS_CLIENT_ID,
            settings.AMADEUS_CLIENT_SECRET,
            settings.AMADEUS_BASE_URL
        )
        self.amadeus_normalizer = AmadeusActivityAdapter()
        self.assignment_engine = ItineraryAssignmentEngine()
    
    async def create_itinerary(
        self,
        user_id: str,
        request: ItineraryCreateRequest
    ) -> Itinerary:
        """
        Create a new itinerary
        
        Flow:
        1. Geocode destination
        2. Fetch activities from Amadeus
        3. Normalize activities
        4. Create day skeleton
        5. Assign activities to days
        6. Calculate pricing
        
        Args:
            user_id: User ID
            request: Itinerary creation request
            
        Returns:
            Complete Itinerary object
        """
        logger.info(f"Creating itinerary for {request.destination}, {request.start_date} to {request.end_date}")
        
        # Step 1: Geocode destination
        location = await GeoResolverService.geocode_destination(request.destination)
        logger.info(f"Geocoded {request.destination} to {location.latitude}, {location.longitude}")
        
        # Step 2: Fetch activities from Amadeus
        raw_activities = await self.amadeus_api.search_activities(
            latitude=location.latitude,
            longitude=location.longitude,
            radius=50,
            max_results=50
        )
        logger.info(f"Fetched {len(raw_activities)} activities from Amadeus")
        
        # Step 3: Normalize activities
        normalized_activities = [
            self.amadeus_normalizer.normalize(activity)
            for activity in raw_activities
        ]
        logger.info(f"Normalized {len(normalized_activities)} activities")
        
        # Step 4: Create day skeleton
        days = self._create_day_skeleton(request.start_date, request.end_date)
        logger.info(f"Created {len(days)} day skeleton")
        
        # Step 5: Assign activities to days
        assigned_days, unassigned = self.assignment_engine.assign_activities(
            normalized_activities, days
        )
        logger.info(f"Assigned activities: {sum(d.total_activities for d in assigned_days)} assigned, {len(unassigned)} unassigned")
        
        # Step 6: Calculate pricing
        total_price, currency = self._calculate_total_price(assigned_days)
        
        # Create itinerary object
        itinerary = Itinerary(
            itinerary_id=str(uuid.uuid4()),
            user_id=user_id,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            total_days=len(days),
            days=assigned_days,
            unassigned_activities=unassigned,
            total_price=total_price,
            currency=currency,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            status="draft"
        )
        
        return itinerary
    
    def _create_day_skeleton(self, start_date: str, end_date: str) -> List[DayPlan]:
        """
        Create empty day structure for the trip
        
        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            List of DayPlan objects with empty slots
        """
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        days = []
        current_date = start
        day_number = 1
        
        while current_date <= end:
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Create slots for the day
            slots = [
                DaySlot(
                    day_number=day_number,
                    date=date_str,
                    time_slot=TimeSlot.MORNING,
                    activity=None,
                    is_available=True
                ),
                DaySlot(
                    day_number=day_number,
                    date=date_str,
                    time_slot=TimeSlot.AFTERNOON,
                    activity=None,
                    is_available=True
                ),
                DaySlot(
                    day_number=day_number,
                    date=date_str,
                    time_slot=TimeSlot.EVENING,
                    activity=None,
                    is_available=True
                )
            ]
            
            day = DayPlan(
                day_number=day_number,
                date=date_str,
                slots=slots,
                total_activities=0,
                is_full=False
            )
            
            days.append(day)
            current_date += timedelta(days=1)
            day_number += 1
        
        return days
    
    def _calculate_total_price(self, days: List[DayPlan]) -> tuple[float, str]:
        """
        Calculate total price from all assigned activities
        
        Args:
            days: List of day plans
            
        Returns:
            (total_price, currency)
        """
        total = 0.0
        currency = "USD"
        
        for day in days:
            for slot in day.slots:
                if slot.activity:
                    total += slot.activity.price_per_person
                    currency = slot.activity.currency  # Use last currency
        
        return round(total, 2), currency
    
    async def move_activity(
        self,
        itinerary: Itinerary,
        request: MoveActivityRequest
    ) -> Itinerary:
        """
        Move activity from one day/slot to another
        
        Args:
            itinerary: Current itinerary
            request: Move request
            
        Returns:
            Updated itinerary
        """
        # Find the activity
        activity = None
        from_day = None
        
        for day in itinerary.days:
            if day.day_number == request.from_day:
                from_day = day
                for slot in day.slots:
                    if slot.activity and slot.activity.activity_id == request.activity_id:
                        activity = slot.activity
                        # Remove from source
                        slot.activity = None
                        slot.is_available = True
                        day.total_activities -= 1
                        day.is_full = False
                        break
        
        if not activity:
            raise ValueError(f"Activity {request.activity_id} not found in day {request.from_day}")
        
        # Find target day
        to_day = next((d for d in itinerary.days if d.day_number == request.to_day), None)
        if not to_day:
            raise ValueError(f"Day {request.to_day} not found")
        
        # Check if can assign to target
        prev_day = None
        if request.to_day > 1:
            prev_day = next((d for d in itinerary.days if d.day_number == request.to_day - 1), None)
        
        can_assign, reason = AssignmentRules.can_assign_to_day(to_day, activity, prev_day)
        
        if not can_assign:
            # Revert: put activity back
            for slot in from_day.slots:
                if slot.time_slot == activity.preferred_time_slot:
                    slot.activity = activity
                    slot.is_available = False
                    from_day.total_activities += 1
                    break
            raise ValueError(f"Cannot move activity: {reason}")
        
        # Assign to target slot
        for slot in to_day.slots:
            if slot.time_slot == request.to_slot and slot.is_available:
                slot.activity = activity
                slot.is_available = False
                to_day.total_activities += 1
                if to_day.total_activities >= AssignmentRules.MAX_ACTIVITIES_PER_DAY:
                    to_day.is_full = True
                break
        
        # Recalculate pricing
        itinerary.total_price, itinerary.currency = self._calculate_total_price(itinerary.days)
        itinerary.updated_at = datetime.utcnow()
        
        return itinerary
    
    async def add_activity(
        self,
        itinerary: Itinerary,
        request: AddActivityRequest
    ) -> Itinerary:
        """
        Add a new activity to the itinerary
        
        Args:
            itinerary: Current itinerary
            request: Add activity request
            
        Returns:
            Updated itinerary
        """
        # Find activity in unassigned list
        activity = next(
            (a for a in itinerary.unassigned_activities if a.activity_id == request.activity_id),
            None
        )
        
        if not activity:
            raise ValueError(f"Activity {request.activity_id} not found in unassigned activities")
        
        # Find target day
        day = next((d for d in itinerary.days if d.day_number == request.day_number), None)
        if not day:
            raise ValueError(f"Day {request.day_number} not found")
        
        # Check if can assign
        prev_day = None
        if request.day_number > 1:
            prev_day = next((d for d in itinerary.days if d.day_number == request.day_number - 1), None)
        
        can_assign, reason = AssignmentRules.can_assign_to_day(day, activity, prev_day)
        
        if not can_assign:
            raise ValueError(f"Cannot add activity: {reason}")
        
        # Assign to slot
        for slot in day.slots:
            if slot.time_slot == request.time_slot and slot.is_available:
                slot.activity = activity
                slot.is_available = False
                day.total_activities += 1
                if day.total_activities >= AssignmentRules.MAX_ACTIVITIES_PER_DAY:
                    day.is_full = True
                break
        
        # Remove from unassigned
        itinerary.unassigned_activities = [
            a for a in itinerary.unassigned_activities 
            if a.activity_id != request.activity_id
        ]
        
        # Recalculate pricing
        itinerary.total_price, itinerary.currency = self._calculate_total_price(itinerary.days)
        itinerary.updated_at = datetime.utcnow()
        
        return itinerary
    
    async def remove_activity(
        self,
        itinerary: Itinerary,
        activity_id: str
    ) -> Itinerary:
        """
        Remove activity from itinerary
        
        Args:
            itinerary: Current itinerary
            activity_id: Activity to remove
            
        Returns:
            Updated itinerary
        """
        # Find and remove activity
        for day in itinerary.days:
            for slot in day.slots:
                if slot.activity and slot.activity.activity_id == activity_id:
                    activity = slot.activity
                    slot.activity = None
                    slot.is_available = True
                    day.total_activities -= 1
                    day.is_full = False
                    
                    # Add to unassigned
                    itinerary.unassigned_activities.append(activity)
                    
                    # Recalculate pricing
                    itinerary.total_price, itinerary.currency = self._calculate_total_price(itinerary.days)
                    itinerary.updated_at = datetime.utcnow()
                    
                    return itinerary
        
        raise ValueError(f"Activity {activity_id} not found in itinerary")
