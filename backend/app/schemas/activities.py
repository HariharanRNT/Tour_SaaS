from pydantic import BaseModel, ConfigDict, UUID4, Field
from decimal import Decimal
from typing import Optional, List
from datetime import datetime


class ActivityImageBase(BaseModel):
    image_url: str
    display_order: int = 0


class ActivityImageCreate(ActivityImageBase):
    pass


class ActivityImageResponse(ActivityImageBase):
    id: UUID4
    
    model_config = ConfigDict(from_attributes=True)


class ActivityBase(BaseModel):
    name: str
    destination_city: str
    category: str
    duration_hours: float
    time_slot_preference: str  # morning, afternoon, evening, full_day
    description: Optional[str] = None
    price_per_person: Optional[Decimal] = None


class ActivityCreate(ActivityBase):
    images: Optional[List[ActivityImageCreate]] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    destination_city: Optional[str] = None
    category: Optional[str] = None
    duration_hours: Optional[float] = None
    time_slot_preference: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[ActivityImageCreate]] = None
    price_per_person: Optional[Decimal] = None


class ActivityResponse(ActivityBase):
    id: UUID4
    agent_id: Optional[UUID4] = None
    images: List[ActivityImageResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DestinationBase(BaseModel):
    name: str = Field(..., max_length=50)
    country: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: bool = True
    is_active: bool = True
    display_order: int = 999

class DestinationCreate(DestinationBase):
    pass

class DestinationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class DestinationSummary(DestinationBase):
    activity_count: int = 0
    package_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedDestinationResponse(BaseModel):
    destinations: List[DestinationSummary]
    total_count: int
    page: int
    limit: int
