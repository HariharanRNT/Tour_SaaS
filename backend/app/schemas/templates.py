"""Pydantic schemas for template and user itinerary management"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from uuid import UUID


# Template Schemas
class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    destination: str = Field(..., min_length=1, max_length=255)
    max_days: int = Field(..., ge=1, le=15)
    description: str


class TemplateActivityCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: str = Field(..., pattern="^(morning|afternoon|evening|night|full_day)$")
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    activities: Optional[List[str]] = []
    display_order: int = Field(default=0, ge=0)


class TemplateActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_slot: Optional[str] = None
    display_order: Optional[int] = None


class TemplateActivityResponse(BaseModel):
    id: UUID
    day_number: int
    time_slot: str
    title: str
    description: str
    activities: List[str]
    display_order: int
    is_optional: bool
    
    class Config:
        from_attributes = True


class TemplateResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    destination: str
    template_max_days: int
    description: str
    is_template: bool
    status: str
    
    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    activities: List[TemplateActivityResponse] = []


# User Itinerary Schemas
class UserItineraryCreate(BaseModel):
    destination: str = Field(..., min_length=1, max_length=255)
    num_days: int = Field(..., ge=1, le=15)
    start_date: Optional[date] = None


class UserActivityData(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[str] = None
    images: Optional[List[str]] = []
    display_order: int = Field(default=0, ge=0)


class UserActivityCreate(BaseModel):
    day_number: int = Field(..., ge=1)
    time_slot: str = Field(..., pattern="^(morning|afternoon|evening|night)$")
    activity_data: UserActivityData


class UserItineraryActivityResponse(BaseModel):
    id: UUID
    day_number: int
    time_slot: str
    activity_id: Optional[str]
    activity_title: str
    activity_description: Optional[str]
    activity_price: Optional[float]
    activity_duration: Optional[str]
    activity_images: Optional[List[str]]
    is_from_template: bool
    display_order: int
    user_notes: Optional[str]
    created_at: Any
    
    class Config:
        from_attributes = True


class UserItineraryResponse(BaseModel):
    id: UUID
    user_id: UUID
    template_package_id: Optional[UUID]
    destination: str
    start_date: Optional[date]
    end_date: Optional[date]
    num_days: int
    status: str
    created_at: Any
    
    class Config:
        from_attributes = True


class UserItineraryDetailResponse(UserItineraryResponse):
    activities: List[UserItineraryActivityResponse] = []
    total_cost: Optional[float] = None


class ItineraryStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(draft|confirmed|booked)$")
