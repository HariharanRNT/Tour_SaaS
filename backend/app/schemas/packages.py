"""Package schemas for API requests and responses"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class PackageStatusEnum(str, Enum):
    """Package status enum for API"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PackageBase(BaseModel):
    title: str
    slug: Optional[str] = None
    destination: str
    duration_days: int
    duration_nights: int
    category: Optional[str] = None
    price_per_person: float
    max_group_size: int = 20
    description: Optional[str] = None
    country: Optional[str] = None
    is_public: bool = True
    included_items: List[str] = []
    excluded_items: List[str] = []
    feature_image_url: Optional[str] = None


class PackageCreate(PackageBase):
    country: str  # Mandatory on creation


class PackageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    category: Optional[str] = None
    price_per_person: Optional[float] = None
    max_group_size: Optional[int] = None
    description: Optional[str] = None
    country: Optional[str] = None
    is_public: Optional[bool] = None
    included_items: Optional[List[str]] = None
    excluded_items: Optional[List[str]] = None
    feature_image_url: Optional[str] = None


class PackageResponse(PackageBase):
    id: UUID
    status: PackageStatusEnum
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        use_enum_values = True


class ItineraryItemBase(BaseModel):
    day_number: int
    title: str
    description: Optional[str] = None
    time_slot: Optional[str] = None
    image_url: Optional[List[str]] = []  # Changed to list of strings
    activities: Optional[List[str]] = []
    meals_included: Optional[str] = None
    display_order: int = 0
    is_optional: bool = False


class ItineraryItemCreate(ItineraryItemBase):
    pass


class ItineraryItemUpdate(BaseModel):
    day_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    time_slot: Optional[str] = None
    image_url: Optional[List[str]] = None  # Changed to list
    activities: Optional[List[str]] = None
    meals_included: Optional[str] = None
    display_order: Optional[int] = None
    is_optional: Optional[bool] = None


class ItineraryItemResponse(ItineraryItemBase):
    id: UUID
    package_id: UUID

    class Config:
        from_attributes = True

    @staticmethod
    def _parse_json_list(v):
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                # If it's a single string (legacy URL), wrap in list
                if parsed and isinstance(parsed, str):
                    return [parsed]
                return []
            except json.JSONDecodeError:
                # Fallback for simple string URL
                return [v] if v else []
        return v if v is not None else []

    @classmethod
    def validate_image_url(cls, v):
        return cls._parse_json_list(v)

    @classmethod
    def validate_activities(cls, v):
        return cls._parse_json_list(v)

    # Pydantic v1 style validator
    try:
        from pydantic import validator
        @validator('image_url', pre=True, check_fields=False)
        def validate_image_url_field(cls, v):
            return cls._parse_json_list(v)

        @validator('activities', pre=True, check_fields=False)
        def validate_activities_field(cls, v):
            return cls._parse_json_list(v)
            
        @validator('meals_included', pre=True, check_fields=False)
        def validate_meals_field(cls, v):
             # meals_included is also JSON string in DB but typically just string in Base?
             # Base defines meals_included as Optional[str]. 
             # If DB stores JSON string, and we want string, it's fine.
             # If we want list, we should change Base. But Base says str.
             # Let's leave meals_included as is for now unless it breaks.
             return v
    except ImportError:
        pass


class PackageImageBase(BaseModel):
    image_url: str
    display_order: int = 0


class PackageImageResponse(PackageImageBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class PackageResponse(PackageBase):
    id: UUID
    status: PackageStatusEnum
    created_at: datetime
    updated_at: Optional[datetime] = None
    itinerary_items: List[ItineraryItemResponse] = []
    images: List[PackageImageResponse] = []

    class Config:
        from_attributes = True
        use_enum_values = True

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
        @validator('included_items', 'excluded_items', pre=True, check_fields=False)
        def validate_json_lists(cls, v):
            return cls._parse_json_list(v)
    except ImportError:
        pass


class PaginatedPackageResponse(BaseModel):
    items: List[PackageResponse]
    total: int
    page: int
    limit: int
