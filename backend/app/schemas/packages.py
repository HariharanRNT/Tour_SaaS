"""Package schemas for API requests and responses"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum
import json as _json


class CancellationRule(BaseModel):
    """Single cancellation rule: if customer cancels >= daysBefore travel, they get refundPercentage."""
    daysBefore: int = Field(..., ge=0, description="Days before travel date")
    refundPercentage: float = Field(..., ge=0, le=100, description="Refund % of paid amount")
    fareType: Optional[str] = Field(
        None,
        description="'total_fare' or 'base_fare'. Only used when gst_applicable=true on the package."
    )


class PackageStatusEnum(str, Enum):
    """Package status enum for API"""
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class PackageBase(BaseModel):
    title: str
    slug: Optional[str] = None
    destination: str
    duration_days: int
    duration_nights: int
    # trip_style stores a JSON-encoded list in the DB; trip_styles is the canonical frontend field
    trip_style: Optional[str] = None          # raw DB column (kept for backward compat)
    trip_styles: List[str] = []               # preferred multi-select field from frontend
    category: Optional[str] = "Adventure"
    price_per_person: float
    max_group_size: int = 20
    description: Optional[str] = None
    country: Optional[str] = None
    is_public: bool = True
    included_items: List[str] = []
    excluded_items: List[str] = []
    feature_image_url: Optional[str] = None
    package_mode: str = "single"
    destinations: List[Dict[str, Any]] = []
    activities: List[str] = []
    # GST Configuration (None = use agent-level defaults)
    gst_applicable: Optional[bool] = None
    gst_percentage: Optional[float] = None
    gst_mode: Optional[str] = None  # 'inclusive' or 'exclusive'
    # Flight Configuration
    flights_enabled: bool = False
    flight_origin_cities: List[str] = []
    flight_cabin_class: str = "ECONOMY"
    flight_price_included: bool = False
    flight_baggage_note: Optional[str] = None
    # Cancellation Policy
    cancellation_enabled: bool = False
    cancellation_rules: List[CancellationRule] = []


class PackageCreate(PackageBase):
    country: str  # Mandatory on creation


class PackageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    trip_style: Optional[str] = None          # raw DB column (kept for backward compat)
    trip_styles: Optional[List[str]] = None   # preferred multi-select field from frontend
    price_per_person: Optional[float] = None
    max_group_size: Optional[int] = None
    description: Optional[str] = None
    country: Optional[str] = None
    is_public: Optional[bool] = None
    included_items: Optional[List[str]] = None
    excluded_items: Optional[List[str]] = None
    feature_image_url: Optional[str] = None
    package_mode: Optional[str] = None
    destinations: Optional[List[Dict[str, Any]]] = None
    activities: Optional[List[str]] = None
    # GST Configuration
    gst_applicable: Optional[bool] = None
    gst_percentage: Optional[float] = None
    gst_mode: Optional[str] = None
    # Flight Configuration
    flights_enabled: Optional[bool] = None
    flight_origin_cities: Optional[List[str]] = None
    flight_cabin_class: Optional[str] = None
    flight_price_included: Optional[bool] = None
    flight_baggage_note: Optional[str] = None
    # Cancellation Policy
    cancellation_enabled: Optional[bool] = None
    cancellation_rules: Optional[List[CancellationRule]] = None


# ---------------------------------------------------------------------------
# Helper: parse a JSON string / list into a Python list
# ---------------------------------------------------------------------------
def _parse_json_list(v) -> list:
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            parsed = _json.loads(v)
            return parsed if isinstance(parsed, list) else []
        except (_json.JSONDecodeError, TypeError):
            return []
    return []


def _parse_trip_styles(v) -> List[str]:
    """Deserialise trip_style DB column (JSON list or plain string) -> List[str]."""
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            parsed = _json.loads(v)
            if isinstance(parsed, list):
                return [str(s) for s in parsed]
            # Legacy: stored as plain string e.g. "Adventure"
            if parsed:
                return [str(parsed)]
        except (_json.JSONDecodeError, TypeError):
            # Plain string stored without JSON encoding
            stripped = v.strip()
            if stripped:
                return [stripped]
    return []


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

    model_config = {"from_attributes": True}

    @model_validator(mode='before')
    @classmethod
    def parse_json_fields(cls, data):
        if hasattr(data, '__dict__'):
            # ORM object -- convert to plain dict
            obj = data
            return {
                'id': getattr(obj, 'id', None),
                'package_id': getattr(obj, 'package_id', None),
                'day_number': getattr(obj, 'day_number', None),
                'title': getattr(obj, 'title', None),
                'description': getattr(obj, 'description', None),
                'time_slot': getattr(obj, 'time_slot', None),
                'image_url': _parse_json_list(getattr(obj, 'image_url', [])),
                'activities': _parse_json_list(getattr(obj, 'activities', [])),
                'meals_included': getattr(obj, 'meals_included', None),
                'display_order': getattr(obj, 'display_order', 0),
                'is_optional': getattr(obj, 'is_optional', False),
            }
        # Dict input (e.g. from test or API body)
        if isinstance(data, dict):
            if 'image_url' in data:
                data['image_url'] = _parse_json_list(data['image_url'])
            if 'activities' in data:
                data['activities'] = _parse_json_list(data['activities'])
        return data


class PackageImageBase(BaseModel):
    image_url: str
    display_order: int = 0


class PackageImageResponse(PackageImageBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class PackageResponse(PackageBase):
    id: UUID
    status: PackageStatusEnum
    created_at: datetime
    updated_at: Optional[datetime] = None
    itinerary_items: List[ItineraryItemResponse] = []
    images: List[PackageImageResponse] = []

    model_config = {"from_attributes": True, "use_enum_values": True}

    @model_validator(mode='before')
    @classmethod
    def parse_and_populate(cls, data):
        """
        Runs before field assignment -- handles:
        1. JSON-string list fields (included_items, activities, etc.)
        2. trip_styles: populated from trip_style column if not already set
        """
        if hasattr(data, '__dict__'):
            # ORM object -- build a plain dict from all relevant attributes
            obj = data
            d: Dict[str, Any] = {
                'id': getattr(obj, 'id', None),
                'status': getattr(obj, 'status', None),
                'created_at': getattr(obj, 'created_at', None),
                'updated_at': getattr(obj, 'updated_at', None),
                'title': getattr(obj, 'title', None),
                'slug': getattr(obj, 'slug', None),
                'destination': getattr(obj, 'destination', None),
                'duration_days': getattr(obj, 'duration_days', None),
                'duration_nights': getattr(obj, 'duration_nights', None),
                'trip_style': getattr(obj, 'trip_style', None),
                'trip_styles': [],   # populated below
                'category': getattr(obj, 'category', None),
                'price_per_person': getattr(obj, 'price_per_person', None),
                'max_group_size': getattr(obj, 'max_group_size', 20),
                'description': getattr(obj, 'description', None),
                'country': getattr(obj, 'country', None),
                'is_public': getattr(obj, 'is_public', True),
                'included_items': _parse_json_list(getattr(obj, 'included_items', '[]')),
                'excluded_items': _parse_json_list(getattr(obj, 'excluded_items', '[]')),
                'feature_image_url': getattr(obj, 'feature_image_url', None),
                'package_mode': getattr(obj, 'package_mode', 'single'),
                'destinations': _parse_json_list(getattr(obj, 'destinations', '[]')),
                'activities': _parse_json_list(getattr(obj, 'activities', '[]')),
                'gst_applicable': getattr(obj, 'gst_applicable', None),
                'gst_percentage': getattr(obj, 'gst_percentage', None),
                'gst_mode': getattr(obj, 'gst_mode', None),
                'flights_enabled': getattr(obj, 'flights_enabled', False),
                'flight_origin_cities': _parse_json_list(getattr(obj, 'flight_origin_cities', '[]')),
                'flight_cabin_class': getattr(obj, 'flight_cabin_class', 'ECONOMY'),
                'flight_price_included': getattr(obj, 'flight_price_included', False),
                'flight_baggage_note': getattr(obj, 'flight_baggage_note', None),
                'cancellation_enabled': getattr(obj, 'cancellation_enabled', False),
                'cancellation_rules': getattr(obj, 'cancellation_rules', []) or [],
                'itinerary_items': getattr(obj, 'itinerary_items', []),
                'images': getattr(obj, 'images', []),
            }
            # Populate trip_styles from the DB column
            d['trip_styles'] = _parse_trip_styles(d['trip_style'])
            return d

        # Dict input
        if isinstance(data, dict):
            for field in ('included_items', 'excluded_items', 'destinations', 'activities', 'flight_origin_cities'):
                if field in data:
                    data[field] = _parse_json_list(data[field])
            # Populate trip_styles if missing or empty
            if not data.get('trip_styles'):
                data['trip_styles'] = _parse_trip_styles(data.get('trip_style'))

        return data


class PaginatedPackageResponse(BaseModel):
    items: List[PackageResponse]
    total: int
    page: int
    limit: int
