"""Pydantic schemas for package system with booking customizations"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from uuid import UUID
from decimal import Decimal


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
    unassigned: List[PackageItineraryItemResponse] = []


class PackageWithItineraryResponse(BaseModel):
    id: UUID
    title: str
    destination: str
    duration_days: int
    country: Optional[str] = None
    price_per_person: Decimal
    description: str
    itinerary_by_day: List[PackageDayItinerary]
    
    class Config:
        from_attributes = True


# Booking Customization Schemas
class BookingCustomizationCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: Optional[str] = Field(None, pattern="^(morning|afternoon|evening|night)$")
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


class BookingWithCustomizationsResponse(BaseModel):
    booking_id: UUID
    package_id: UUID
    travel_date: date
    number_of_travelers: int
    total_amount: Decimal
    customizations: List[BookingCustomizationResponse] = []
    final_itinerary: List[PackageDayItinerary] = []
    
    class Config:
        from_attributes = True


# Admin Package Management Schemas
class ItineraryItemCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: str = Field(..., pattern="^(morning|afternoon|evening|night|full_day)$")
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    activities: Optional[List[str]] = []
    display_order: int = Field(default=0, ge=0)


class ItineraryItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_slot: Optional[str] = None
    display_order: Optional[int] = None
