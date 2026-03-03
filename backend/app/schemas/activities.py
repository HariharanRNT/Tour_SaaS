from pydantic import BaseModel, ConfigDict, UUID4
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

class DestinationSummary(BaseModel):
    city: str
    activity_count: int
