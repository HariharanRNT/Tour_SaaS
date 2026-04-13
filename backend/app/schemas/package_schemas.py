"""Pydantic schemas for package system with booking customizations"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from uuid import UUID
from decimal import Decimal


# Cancellation Rule Schema
class CancellationRule(BaseModel):
    daysBefore: int = Field(..., ge=0)
    refundPercentage: float = Field(..., ge=0, le=100)
    fareType: Optional[str] = Field(None)

# Package Itinerary Schemas
class PackageItineraryItemResponse(BaseModel):
    id: UUID
    day_number: int
    time_slot: Optional[str]
    title: str
    description: str
    image_url: Optional[str] = None
    images: List[str] = []
    activities: List[str]
    display_order: int
    
    class Config:
        from_attributes = True


class PackageDayItinerary(BaseModel):
    day_number: int
    morning: List[PackageItineraryItemResponse] = []
    afternoon: List[PackageItineraryItemResponse] = []
    evening: List[PackageItineraryItemResponse] = []
    night: List[PackageItineraryItemResponse] = []
    half_day: List[PackageItineraryItemResponse] = []
    full_day: List[PackageItineraryItemResponse] = []
    unassigned: List[PackageItineraryItemResponse] = []


class PackageWithItineraryResponse(BaseModel):
    id: UUID
    title: str
    slug: Optional[str] = None
    destination: str
    duration_days: int
    duration_nights: Optional[int] = None
    country: Optional[str] = None
    price_per_person: Decimal
    description: str
    feature_image_url: Optional[str] = None
    destination_image_url: Optional[str] = None
    gst_applicable: Optional[bool] = None
    gst_percentage: Optional[Decimal] = None
    gst_mode: Optional[str] = None
    # Flight Configuration
    flights_enabled: bool = False
    flight_origin_cities: List[str] = []
    flight_cabin_class: str = "ECONOMY"
    flight_price_included: bool = False
    flight_baggage_note: Optional[str] = None
    
    itinerary_by_day: List[PackageDayItinerary]
    
    # Cancellation Policy
    cancellation_enabled: bool = False
    cancellation_rules: List[CancellationRule] = []
    
    # Multi-Dest Support
    package_mode: str = "single"
    destinations: List[Dict[str, Any]] = []
    trip_style: Optional[str] = None
    
    homepage_settings: Optional[Dict[str, Any]] = None
    
    # Dual Booking Fields
    booking_type: str = "INSTANT"
    price_label: Optional[str] = None
    enquiry_payment: str = "OFFLINE"
    
    class Config:
        from_attributes = True

    @classmethod
    def _parse_json_list(cls, v):
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        return v if v is not None else []

    try:
        from pydantic import validator
        @validator('flight_origin_cities', 'destinations', 'cancellation_rules', pre=True, check_fields=False)
        def validate_json_lists(cls, v):
            return cls._parse_json_list(v)
    except ImportError:
        pass


# Booking Customization Schemas
class BookingCustomizationCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: Optional[str] = Field(None, pattern="^(morning|afternoon|evening|night|half_day|full_day)$")
    activity_title: str = Field(..., min_length=1, max_length=255)
    activity_description: Optional[str] = None
    activity_price: Optional[Decimal] = None
    is_removed: bool = Field(default=False)
    is_custom: bool = Field(default=False)
    original_item_id: Optional[UUID] = None
    display_order: int = Field(default=0, ge=0)


class BookingCustomizationResponse(BaseModel):
    id: UUID
    booking_id: UUID
    day_number: int
    time_slot: Optional[str]
    activity_title: str
    activity_description: Optional[str]
    activity_price: Optional[Decimal]
    is_removed: bool
    is_custom: bool
    original_item_id: Optional[UUID]
    display_order: int
    created_at: Any
    
    class Config:
        from_attributes = True


class BookingWithCustomizationsCreate(BaseModel):
    package_id: UUID
    travel_date: date
    number_of_travelers: int = Field(..., ge=1)
    customizations: Optional[List[BookingCustomizationCreate]] = []
    # Flight Selection
    flight_origin: Optional[str] = None
    flight_fare: Optional[Decimal] = None
    flight_details: Optional[Dict[str, Any]] = None


class BookingWithCustomizationsResponse(BaseModel):
    booking_id: UUID
    package_id: UUID
    travel_date: date
    number_of_travelers: int
    total_amount: Decimal
    customizations: List[BookingCustomizationResponse] = []
    # Flight Selection
    flight_origin: Optional[str] = None
    flight_fare: Optional[Decimal] = None
    flight_details: Optional[Dict[str, Any]] = None
    final_itinerary: List[PackageDayItinerary] = []
    
    class Config:
        from_attributes = True


# Admin Package Management Schemas
class ItineraryItemCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: str = Field(..., pattern="^(morning|afternoon|evening|night|half_day|full_day)$")
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    activities: Optional[List[str]] = []
    display_order: int = Field(default=0, ge=0)


class ItineraryItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_slot: Optional[str] = None
    display_order: Optional[int] = None
