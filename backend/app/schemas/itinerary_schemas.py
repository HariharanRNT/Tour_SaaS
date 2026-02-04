"""Pydantic schemas for itinerary planning"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.enums import ActivityType, TimeSlot, PhysicalIntensity, Category


class Location(BaseModel):
    """Geographic location"""
    latitude: float
    longitude: float
    address: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = ""


class NormalizedActivity(BaseModel):
    """Internal unified activity schema"""
    activity_id: str
    supplier: str
    supplier_activity_id: str
    
    # Basic info
    title: str
    description: str
    category: Category
    
    # Timing
    duration_hours: float
    activity_type: ActivityType
    preferred_time_slot: TimeSlot
    
    # Pricing
    price_per_person: float
    currency: str
    
    # Physical attributes
    physical_intensity: PhysicalIntensity
    min_age: Optional[int] = None
    max_group_size: Optional[int] = None
    
    # Location
    location: Location
    
    # Metadata
    images: List[str] = []
    rating: float = 0.0
    booking_link: str = ""
    
    # Availability
    available_dates: Optional[List[str]] = None
    requires_booking: bool = True


class DaySlot(BaseModel):
    """Represents a time slot within a day"""
    day_number: int
    date: str  # YYYY-MM-DD
    time_slot: TimeSlot
    activity: Optional[NormalizedActivity] = None
    is_available: bool = True


class DayPlan(BaseModel):
    """Represents a single day in the itinerary"""
    day_number: int
    date: str
    slots: List[DaySlot]
    total_activities: int = 0
    is_full: bool = False
    
    def can_add_activity(self, activity: NormalizedActivity) -> bool:
        """Check if activity can be added to this day"""
        if self.is_full:
            return False
        
        if activity.activity_type == ActivityType.FULL_DAY:
            # FULL_DAY needs MORNING + AFTERNOON free
            morning_free = self._is_slot_free(TimeSlot.MORNING)
            afternoon_free = self._is_slot_free(TimeSlot.AFTERNOON)
            return morning_free and afternoon_free
        
        # Check if preferred slot is free
        return self._is_slot_free(activity.preferred_time_slot)
    
    def _is_slot_free(self, slot: TimeSlot) -> bool:
        """Check if a specific slot is available"""
        for day_slot in self.slots:
            if day_slot.time_slot == slot:
                return day_slot.is_available
        return False


class Itinerary(BaseModel):
    """Complete trip itinerary"""
    itinerary_id: str
    user_id: str
    destination: str
    start_date: str
    end_date: str
    total_days: int
    
    days: List[DayPlan]
    unassigned_activities: List[NormalizedActivity] = []
    
    total_price: float = 0.0
    currency: str = "USD"
    
    created_at: datetime
    updated_at: datetime
    status: str = "draft"  # draft, confirmed, booked


# Request/Response schemas
class ItineraryCreateRequest(BaseModel):
    """Request to create itinerary"""
    destination: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    preferences: Optional[dict] = {}


class MoveActivityRequest(BaseModel):
    """Request to move activity between days"""
    activity_id: str
    from_day: int
    to_day: int
    to_slot: TimeSlot


class AddActivityRequest(BaseModel):
    """Request to add activity to itinerary"""
    activity_id: str
    day_number: int
    time_slot: TimeSlot


class ItineraryResponse(BaseModel):
    """Response with itinerary data"""
    success: bool
    itinerary: Itinerary
    message: Optional[str] = None
