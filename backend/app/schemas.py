"""Pydantic schemas for API request/response models"""
import json
import re
import html
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Union
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator
from app.models import UserRole, PackageStatus, BookingStatus, PaymentStatus, ApprovalStatus


# ──────────────────────────────────────────────────────────────────────────────
# Input Sanitization Helpers (B-01 XSS / B-02 SQLi)
# ──────────────────────────────────────────────────────────────────────────────
_HTML_TAG_RE = re.compile(r'<[^>]+>')
_SQL_PATTERN = re.compile(
    r"(--|;|\bDROP\b|\bTABLE\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bSELECT\b|\bUNION\b|'\\ *OR|xp_)",
    re.IGNORECASE
)
_PHONE_RE = re.compile(r'^\+?[\d\s\-().]{7,15}$')


def strip_xss(value: str) -> str:
    """Strip HTML tags and unescape entities to prevent XSS persistence."""
    if value is None:
        return value
    cleaned = _HTML_TAG_RE.sub('', value)
    cleaned = html.unescape(cleaned)
    return cleaned.strip()


def reject_sql(value: str, field_name: str = 'field') -> str:
    """Raise ValueError if value contains obvious SQL injection patterns."""
    if value and _SQL_PATTERN.search(value):
        raise ValueError(f"{field_name} contains invalid characters or reserved keywords.")
    return value


# User Schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=0, max_length=100)
    last_name: Optional[str] = Field(None, min_length=0, max_length=100)
    phone: Optional[str] = None

    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def sanitize_name(cls, v):
        if not isinstance(v, str):
            return v
        v = strip_xss(v).strip()
        reject_sql(v, 'name')
        return v

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError('Phone number must be 7–15 digits.')
        return v


class UserCreate(UserBase):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    domain: Optional[str] = Field(None, max_length=100)
    
    # Agent Specific
    agency_name: Optional[str] = Field(None, max_length=200)
    company_legal_name: Optional[str] = Field(None, max_length=200)
    business_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    gst_no: Optional[str] = Field(None, max_length=20)
    tax_id: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = Field("INR", min_length=3, max_length=3)
    commission_type: Optional[str] = "percentage"
    commission_value: Optional[Decimal] = Field(0.0, ge=0)
    approval_status: Optional[ApprovalStatus] = ApprovalStatus.APPROVED

    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def validate_names_strict(cls, v):
        if not isinstance(v, str) or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only.')
        v = strip_xss(v)
        reject_sql(v, 'name')
        return v.strip()

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_strict(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not _PHONE_RE.match(v):
            raise ValueError('Phone number must be 7–15 digits.')
        return v


class UserUpdate(BaseModel):
    # Personal
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = None
    
    # Agency
    agency_name: Optional[str] = Field(None, max_length=200)
    company_legal_name: Optional[str] = Field(None, max_length=200)
    domain: Optional[str] = Field(None, max_length=100)
    business_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    
    # Financial
    gst_no: Optional[str] = Field(None, max_length=20)
    tax_id: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    commission_type: Optional[str] = None
    commission_value: Optional[Decimal] = Field(None, ge=0)
    
    # Status
    is_active: Optional[bool] = None

    @field_validator(
        'first_name', 'last_name', 'agency_name', 'company_legal_name', 
        'business_address', 'city', 'state', 'country', 'domain',
        mode='before'
    )
    @classmethod
    def sanitize_all_text(cls, v):
        if not isinstance(v, str):
            return v
        v = strip_xss(v).strip()
        reject_sql(v, 'field')
        return v

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_update(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError('Phone number must be 7–15 digits.')
        return v


class AgentRegistration(BaseModel):
    # Agency Details
    agency_name: str = Field(..., min_length=1, max_length=200)
    company_legal_name: str = Field(..., min_length=1, max_length=200)
    domain: str = Field(..., min_length=1, max_length=100)
    business_address: str = Field(..., min_length=1, max_length=500)
    country: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    
    # Contact Details
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str
    
    # Credentials
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator(
        'agency_name', 'company_legal_name', 'business_address',
        'country', 'state', 'city', 'first_name', 'last_name',
        mode='before'
    )
    @classmethod
    def sanitize_text_fields(cls, v):
        """B-01/B-02/B-08: Strip XSS, reject SQLi, reject whitespace-only."""
        if not isinstance(v, str):
            return v
        v = strip_xss(v)
        reject_sql(v, 'field')
        if not v.strip():
            raise ValueError('Field cannot be empty or contain only whitespace.')
        return v

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        """B-05: Validate phone number format."""
        if not v or (isinstance(v, str) and not v.strip()):
            return None
        v = str(v).strip()
        if not _PHONE_RE.match(v):
            raise ValueError('Phone number must be 7–15 digits and may include +, spaces, dashes, or parentheses.')
        return v

    @field_validator('domain', mode='before')
    @classmethod
    def validate_domain(cls, v):
        """B-06: Validate domain format — no spaces, auto-strip protocol."""
        if not isinstance(v, str):
            return v
        v = v.strip()
        if not v:
            raise ValueError('Domain cannot be empty.')
        if ' ' in v:
            raise ValueError('Domain cannot contain spaces.')
        
        # Auto-strip protocol if provided
        v = re.sub(r'^https?://', '', v, flags=re.IGNORECASE)
        
        domain_re = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9]$')
        if not domain_re.match(v):
            raise ValueError('Domain must be a valid hostname (e.g., myagency.com).')
        return v

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    token: str
    role: Optional[UserRole] = UserRole.CUSTOMER


class UserResponse(UserBase):
    id: Optional[UUID4] = None
    role: Optional[UserRole] = None
    domain: Optional[str] = None
    
    # Agent Fields (Populated via proxy or flattened)
    agency_name: Optional[str] = None
    company_legal_name: Optional[str] = None
    business_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    gst_no: Optional[str] = None
    commission_type: Optional[str] = None
    commission_value: Optional[Decimal] = None
    approval_status: Optional[ApprovalStatus] = ApprovalStatus.PENDING
    email_verified: bool = False
    is_active: bool = True
    
    # Subscription Fields
    has_active_subscription: bool = False
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[date] = None
    
    # Sub-User Fields
    permissions: Optional[List[dict]] = None
    agent_id: Optional[UUID4] = None
    sub_user_id: Optional[UUID4] = None
    
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Agent Settings Schemas
class AgentSMTPSettingsBase(BaseModel):
    host: str
    port: int
    username: str
    password: Optional[str] = None  # Optional on update (to keep existing)
    from_email: str 
    from_name: str
    encryption_type: str = "tls"

class AgentGeneralSettingsUpdate(BaseModel):
    currency: Optional[str] = Field("INR", min_length=3, max_length=3)
    gst_applicable: Optional[bool] = False
    gst_inclusive: Optional[bool] = False
    gst_percentage: Optional[Decimal] = Field(Decimal("18.00"), ge=0, le=100)

class AgentSMTPSettingsCreate(AgentSMTPSettingsBase):
    pass

class AgentSMTPSettingsResponse(AgentSMTPSettingsBase):
    id: UUID4
    
    @field_validator('password', mode='after')
    @classmethod
    def mask_password(cls, v):
        return "********" if v else None
    
    class Config:
        from_attributes = True

class AgentRazorpaySettingsBase(BaseModel):
    key_id: str
    key_secret: Optional[str] = None # Optional on update

class AgentRazorpaySettingsCreate(AgentRazorpaySettingsBase):
    pass

class AgentRazorpaySettingsResponse(AgentRazorpaySettingsBase):
    id: UUID4
    
    @field_validator('key_secret', mode='after')
    @classmethod
    def mask_secret(cls, v):
        return "********" if v else None
    
    class Config:
        from_attributes = True

class AgentSettingsResponse(BaseModel):
    agency_name: Optional[str] = None
    currency: str = "INR"
    gst_applicable: bool = False
    gst_inclusive: bool = False
    gst_percentage: Decimal = Decimal("18.00")
    smtp: Optional[AgentSMTPSettingsResponse] = None
    razorpay: Optional[AgentRazorpaySettingsResponse] = None
    homepage_settings: Optional[dict] = None
    
    class Config:
        from_attributes = True


class HomepageWcuCard(BaseModel):
    icon: str
    title: str
    description: str

class HomepageCardAppearance(BaseModel):
    iconStyle: str = "simple" # simple, circle, filled-circle, gradient-circle
    background: str = "glass" # glass, white, light, dark, primary-tint
    border: str = "none" # none, thin, thick, glow
    hover: str = "lift" # none, lift, glow, scale
    titleColor: str = "default" # default, primary, gradient
    layout: str = "vertical" # vertical, horizontal
    iconColor: str = "primary" # primary, white, custom
    customIconColor: str = "#3B82F6"

class HomepageSettingsUpdate(BaseModel):
    agency_name: Optional[str] = Field(None, max_length=200)
    headline1: Optional[str] = Field(None, max_length=200)
    headline2: Optional[str] = Field(None, max_length=200)
    subheading: Optional[str] = Field(None, max_length=500)
    primaryBtnText: Optional[str] = Field(None, max_length=50)
    secondaryBtnText: Optional[str] = Field(None, max_length=50)
    backgroundImageUrl: Optional[str] = None
    navbar_logo_image: Optional[str] = None
    badgeText: Optional[str] = Field(None, max_length=100)
    showAiBadge: Optional[bool] = None
    feature_cards: Optional[List[dict]] = None
    wcu_cards: Optional[List[dict]] = None
    card_appearance: Optional[HomepageCardAppearance] = None
    # Plan Trip Theme customization
    activeTheme: Optional[str] = None
    primaryColor: Optional[str] = None
    secondaryColor: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    plan_trip_heading: Optional[str] = Field(None, max_length=200)
    plan_trip_italic: Optional[str] = Field(None, max_length=200)
    plan_trip_subheading: Optional[str] = Field(None, max_length=500)
    plan_trip_placeholder: Optional[str] = Field(None, max_length=100)
    plan_trip_button_text: Optional[str] = Field(None, max_length=50)
    plan_trip_stats_text: Optional[str] = Field(None, max_length=200)
    plan_trip_categories: Optional[List[str]] = None
    plan_trip_section_heading: Optional[str] = Field(None, max_length=200)
    plan_trip_section_subtext: Optional[str] = Field(None, max_length=500)
    destinations_heading: Optional[str] = Field(None, max_length=200)
    destinations_subtext: Optional[str] = Field(None, max_length=500)
    destinations_link_text: Optional[str] = Field(None, max_length=100)
    destinations_cta_text: Optional[str] = Field(None, max_length=100)
    # ITINERARY PAGE THEME (NEW)
    itinerary_wcu_cards: Optional[List[dict]] = None # [{icon, title, description}]
    itinerary_card_style: Optional[str] = "glassy" # glassy, minimal, rounded, classic
    itinerary_summary_card_style: Optional[str] = "glassy" # glassy, minimal, rounded
    itinerary_why_book_style: Optional[str] = "glassy" # glassy, minimal, rounded
    itinerary_primary_color: Optional[str] = None
    itinerary_secondary_color: Optional[str] = None
    itinerary_font_family: Optional[str] = None
    itinerary_button_style: Optional[str] = "pill" # pill, rounded, square
    itinerary_header_colors: Optional[dict] = None # { morning: '', afternoon: '', ... }
    # UI Toggles and other page settings
    show_category_pills: Optional[bool] = None
    show_stat_bar: Optional[bool] = None
    packages_title: Optional[str] = Field(None, max_length=200)
    packages_subtitle: Optional[str] = Field(None, max_length=500)
    show_best_seller_badge: Optional[bool] = None
    show_top_rated_badge: Optional[bool] = None
    show_wishlist: Optional[bool] = None
    show_ai_optimized_badge: Optional[bool] = None
    ai_optimized_text: Optional[str] = Field(None, max_length=100)
    morning_label: Optional[str] = Field(None, max_length=50)
    afternoon_label: Optional[str] = Field(None, max_length=50)
    evening_label: Optional[str] = Field(None, max_length=50)
    night_label: Optional[str] = Field(None, max_length=50)
    show_activity_images: Optional[bool] = None
    cart_summary_title: Optional[str] = Field(None, max_length=100)
    cart_cta_text: Optional[str] = Field(None, max_length=100)
    show_gst_breakdown: Optional[bool] = None
    show_per_person: Optional[bool] = None
    show_verified_badge: Optional[bool] = None
    show_support_badge: Optional[bool] = None
    show_flexible_badge: Optional[bool] = None
    modal_cta_text: Optional[str] = Field(None, max_length=100)
    package_cta_text: Optional[str] = Field(None, max_length=100)
    # Design File Alignment
    buttonStyle: Optional[dict] = None
    navbarSettings: Optional[dict] = None
    layoutChoices: Optional[dict] = None
    
    # Global Style Settings
    font_family: Optional[str] = None
    font_color: Optional[str] = None
    
    # Email Settings
    default_email_theme: Optional[str] = None
    default_email_message: Optional[str] = None
    email_templates: Optional[dict] = None

    @field_validator(
        'agency_name', 'headline1', 'headline2', 'subheading', 
        'primaryBtnText', 'secondaryBtnText', 'badgeText',
        'plan_trip_heading', 'plan_trip_italic', 'plan_trip_subheading',
        'plan_trip_placeholder', 'plan_trip_button_text', 'plan_trip_stats_text',
        'plan_trip_section_heading', 'plan_trip_section_subtext',
        'destinations_heading', 'destinations_subtext', 'destinations_link_text',
        'destinations_cta_text', 'packages_title', 'packages_subtitle',
        'ai_optimized_text', 'morning_label', 'afternoon_label', 
        'evening_label', 'night_label', 'cart_summary_title', 
        'cart_cta_text', 'modal_cta_text', 'package_cta_text',
        mode='before'
    )
    @classmethod
    def sanitize_homepage_text(cls, v):
        if not isinstance(v, str):
            return v
        v = strip_xss(v).strip()
        reject_sql(v, 'field')
        return v

    @field_validator('backgroundImageUrl', 'navbar_logo_image', mode='before')
    @classmethod
    def validate_urls(cls, v):
        if not v or not isinstance(v, str):
            return v
        if not re.match(r'^https?://', v, re.IGNORECASE) and not v.startswith('data:image/'):
             raise ValueError('Invalid URL format. Must be http/https or data URL.')
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Package Schemas
class PackageImageBase(BaseModel):
    image_url: str
    display_order: int = 0


class PackageImageResponse(PackageImageBase):
    id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True


class ItineraryItemBase(BaseModel):
    day_number: int
    title: str
    description: str
    activities: List[str] = []
    meals_included: List[str] = []


class ItineraryItemResponse(ItineraryItemBase):
    id: UUID4
    
    @field_validator('activities', 'meals_included', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v if v is not None else []
    
    class Config:
        from_attributes = True


class PackageAvailabilityBase(BaseModel):
    available_from: date
    available_to: date
    max_bookings: int = Field(10, ge=0)
    is_blackout: bool = False

    @field_validator('available_to')
    @classmethod
    def validate_date_range(cls, v, info):
        if 'available_from' in info.data and v < info.data['available_from']:
            raise ValueError('available_to must be after or same as available_from')
        return v


class PackageAvailabilityResponse(PackageAvailabilityBase):
    id: UUID4
    current_bookings: int
    
    class Config:
        from_attributes = True


class PackageBase(BaseModel):
    title: str = Field(..., min_length=0, max_length=200)
    description: str = Field(..., min_length=0, max_length=5000)
    destination: str = Field(..., min_length=0, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    duration_days: int = Field(..., ge=1)
    duration_nights: int = Field(..., ge=0)
    trip_style: Optional[str] = Field(None, max_length=50)
    price_per_person: Decimal = Field(..., ge=0)
    max_group_size: int = Field(20, ge=1)
    included_items: List[str] = []
    excluded_items: List[str] = []
    package_mode: str = "single"
    destinations: List[dict] = []
    activities: List[str] = []
    is_popular_destination: bool = False
    feature_image_url: Optional[str] = None
    destination_image_url: Optional[str] = None
    view_count: int = 0
    # Flight Configuration
    flights_enabled: bool = False
    flight_origin_cities: List[str] = []
    flight_cabin_class: str = "ECONOMY"
    flight_price_included: bool = False
    flight_baggage_note: Optional[str] = Field(None, max_length=500)
    # Cancellation Policy
    cancellation_enabled: bool = False
    cancellation_rules: List[dict] = []

    @field_validator('title', 'description', 'destination', 'country', 'trip_style', 'flight_baggage_note', mode='before')
    @classmethod
    def sanitize_package_text(cls, v):
        """B-01/B-02/B-08: Strip XSS, reject SQLi. Empty strings allowed for legacy read compatibility."""
        if v is None or not isinstance(v, str):
            return v
        v = strip_xss(v)
        reject_sql(v, 'field')
        return v.strip()


class PackageCreate(PackageBase):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    destination: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    is_public: bool = True
    itinerary_items: List[ItineraryItemBase] = []
    availability: List[PackageAvailabilityBase] = []


class PackageUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    destination: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    duration_days: Optional[int] = Field(None, ge=1)
    duration_nights: Optional[int] = Field(None, ge=0)
    trip_style: Optional[str] = Field(None, max_length=50)
    price_per_person: Optional[Decimal] = Field(None, ge=0)
    max_group_size: Optional[int] = Field(None, ge=1)
    included_items: Optional[List[str]] = None
    excluded_items: Optional[List[str]] = None
    package_mode: Optional[str] = None
    destinations: Optional[List[dict]] = None
    activities: Optional[List[str]] = None
    status: Optional[PackageStatus] = None
    is_public: Optional[bool] = None
    is_popular_destination: Optional[bool] = None
    feature_image_url: Optional[str] = None
    view_count: Optional[int] = None
    # Flight Configuration
    flights_enabled: Optional[bool] = None
    flight_origin_cities: Optional[List[str]] = None
    flight_cabin_class: Optional[str] = None
    flight_price_included: Optional[bool] = None
    flight_baggage_note: Optional[str] = Field(None, max_length=500)
    # Cancellation Policy
    cancellation_enabled: Optional[bool] = None
    cancellation_rules: Optional[List[dict]] = None

    @field_validator('title', 'description', 'destination', 'country', 'trip_style', 'flight_baggage_note', mode='before')
    @classmethod
    def sanitize_update_text(cls, v):
        if v is None or not isinstance(v, str):
            return v
        v = strip_xss(v)
        reject_sql(v, 'field')
        # Update fields can be empty if they were meant to be cleared, 
        # but usually we want at least 1 char if provided.
        if v is not None and not v.strip():
             return None # Or allow? For now, if provided, must be valid.
        return v.strip()


class PackageResponse(PackageBase):
    id: UUID4
    slug: str
    status: PackageStatus
    is_public: bool
    created_at: datetime
    images: List[PackageImageResponse] = []
    itinerary_items: List[ItineraryItemResponse] = []
    availability: List[PackageAvailabilityResponse] = []

    @field_validator('title', 'description', 'destination', 'country', 'trip_style', 'flight_baggage_note', mode='before')
    @classmethod
    def sanitize_package_text(cls, v):
        """On read: only strip XSS — do NOT reject SQL patterns (data is already in DB)."""
        if v is None or not isinstance(v, str):
            return v
        return strip_xss(v).strip()

    @field_validator('included_items', 'excluded_items', 'destinations', 'activities', 'flight_origin_cities', 'cancellation_rules', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v if v is not None else []
    
    class Config:
        from_attributes = True


class PackageListResponse(BaseModel):
    packages: List[PackageResponse]
    total: int
    page: int
    page_size: int


# Booking Schemas
class TravelerBase(BaseModel):
    first_name: Optional[str] = Field(None, min_length=0)
    last_name: Optional[str] = Field(None, min_length=0)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, min_length=0)
    passport_number: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, min_length=0)
    type: Optional[str] = Field(None, min_length=0)
    is_primary: Optional[bool] = False

    @field_validator('first_name', 'last_name', 'nationality', mode='before')
    @classmethod
    def sanitize_traveler_text(cls, v):
        """B-01/B-02/B-08: Strip XSS, reject SQLi. Empty strings allowed for legacy read compatibility."""
        if not isinstance(v, str):
            return v
        v = strip_xss(v)
        reject_sql(v, 'traveler field')
        return v.strip()

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def validate_dob(cls, v):
        """B-07: Traveler DOB must be in the past and not more than 120 years ago."""
        if isinstance(v, str):
            try:
                v = date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD.')
        today = date.today()
        if v >= today:
            raise ValueError('Date of birth must be in the past.')
        if (today - v).days > 120 * 365:
            raise ValueError('Date of birth cannot be more than 120 years ago.')
        return v


class TravelerResponse(TravelerBase):
    id: UUID4
    
    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    package_id: UUID4
    travel_date: date
    number_of_travelers: int = Field(..., ge=1, le=50)
    travelers: List[TravelerBase]
    special_requests: Optional[str] = Field(None, max_length=2000)
    customer_id: Optional[UUID4] = None

    @field_validator('special_requests', mode='before')
    @classmethod
    def sanitize_special_requests(cls, v):
        """B-01/B-02: Strip XSS from special requests field."""
        if v is None:
            return v
        v = strip_xss(str(v))
        reject_sql(v, 'special_requests')
        return v


class BookingResponse(BaseModel):
    id: Optional[UUID4] = None
    booking_reference: Optional[str] = None
    package_id: Optional[UUID4] = None
    user_id: Optional[UUID4] = None
    travel_date: Optional[date] = None
    number_of_travelers: Optional[int] = 0
    total_amount: Optional[Decimal] = Decimal('0.00')
    status: Optional[BookingStatus] = None
    payment_status: Optional[PaymentStatus] = None
    special_requests: Optional[str] = None
    tripjack_booking_id: Optional[str] = None
    # Cancellation / Refund fields
    refund_amount: Optional[Decimal] = None
    cancelled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    travelers: List[TravelerResponse] = []
    
    class Config:
        from_attributes = True


class RefundInfo(BaseModel):
    """Summary of refund details for a cancelled booking."""
    status: str  # initiated, pending, succeeded, failed
    refund_amount: Decimal
    razorpay_refund_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None

    class Config:
        from_attributes = True


class BookingWithPackageResponse(BookingResponse):
    package: Optional[PackageResponse] = None
    user: Optional[UserResponse] = None
    refund: Optional[RefundInfo] = None  # Populated from BookingRefund relationship
    
    class Config:
        from_attributes = True


class CancelPreviewResponse(BaseModel):
    """Read-only preview of what refund a customer would get."""
    cancellation_enabled: bool
    days_before: int
    paid_amount: Decimal
    refund_amount: Decimal
    refund_percentage: float
    message: str


class CancelActionResponse(BaseModel):
    """Response after customer confirms cancellation."""
    booking_id: UUID4
    status: str
    refund_amount: Decimal
    refund_percentage: float
    days_before: int
    refund_status: str   # initiated / succeeded / pending / failed
    message: str


# Payment Schemas
class PaymentOrderCreate(BaseModel):
    booking_id: UUID4


class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    id: UUID4
    booking_id: UUID4
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: Decimal
    currency: str
    status: PaymentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


# Common Schemas
class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


# Trip Planner Schemas
class ActivityUpdate(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    image_url: Optional[Union[str, List[str]]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field("INR", min_length=3, max_length=3)
    activities: Optional[List[str]] = []
    meals_included: Optional[List[str]] = []
    display_order: int = Field(0, ge=0)
    rating: Optional[float] = Field(None, ge=0, le=5)
    location: Optional[str] = Field(None, max_length=200)

    @field_validator('title', 'description', 'location', mode='before')
    @classmethod
    def sanitize_activity_text(cls, v):
        if not isinstance(v, str):
            return v
        v = strip_xss(v).strip()
        reject_sql(v, 'field')
        return v

class DayScheduleUpdate(BaseModel):
    day_number: int
    morning: List[ActivityUpdate] = []
    afternoon: List[ActivityUpdate] = []
    evening: List[ActivityUpdate] = []
    night: List[ActivityUpdate] = []

class FlightSegmentUpdate(BaseModel):
    id: str
    priceId: str
    price: float
    airline: str
    flight_number: str
    departure: str
    arrival: str
    airline_code: Optional[str] = None
    duration: Optional[str] = None
    duration_minutes: Optional[int] = None
    stops: Optional[int] = 0
    origin: Optional[str] = None
    destination: Optional[str] = None
    cabin_class: Optional[str] = "ECONOMY"
    baggage: Optional[str] = None
    is_refundable: Optional[bool] = False

class FlightDetailsUpdate(BaseModel):
    price: float
    priceId: Optional[str] = None
    onward: Optional[FlightSegmentUpdate] = None
    return_: Optional[FlightSegmentUpdate] = Field(None, alias='return')

    class Config:
        populate_by_name = True

class TripSessionUpdate(BaseModel):
    itinerary: List[DayScheduleUpdate] = []
    flight_details: Optional[FlightDetailsUpdate] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    start_date: Optional[date] = None
    travelers: Optional[dict] = None
    preferences: Optional[dict] = None
    package_id: Optional[UUID4] = None


# Subscription Schemas
class SubscriptionPlanBase(BaseModel):
    name: str
    price: Decimal
    currency: str = "INR"
    billing_cycle: str = "monthly"
    duration_days: Optional[int] = None
    features: List[str] = []
    booking_limit: int
    is_active: bool = True

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    billing_cycle: Optional[str] = None
    duration_days: Optional[int] = None
    features: Optional[List[str]] = None
    booking_limit: Optional[int] = None
    is_active: Optional[bool] = None

class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_popular: bool = False
    
    @field_validator('features', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v if v is not None else []

    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    plan_id: UUID4
    status: str
    start_date: date
    end_date: date
    auto_renew: bool = True
    
    @field_validator('auto_renew', mode='before')
    @classmethod
    def handle_null_bool(cls, v):
        return v if v is not None else True

class SubscriptionResponse(SubscriptionBase):
    id: UUID4
    user_id: UUID4
    current_bookings_usage: int
    plan: SubscriptionPlanResponse
    created_at: datetime
    
    @field_validator('current_bookings_usage', mode='before')
    @classmethod
    def handle_null_usage(cls, v):
        return v if v is not None else 0
    
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: UUID4
    amount: Decimal
    status: str
    issue_date: date
    due_date: date
    pdf_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class SubscriptionPurchaseResponse(BaseModel):
    order_id: Optional[str] = None
    amount: int
    currency: str
    key_id: str
    subscription_id: UUID4
    razorpay_subscription_id: Optional[str] = None

class SubscriptionPaymentVerification(BaseModel):
    subscription_id: UUID4
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: str
    razorpay_signature: str
    razorpay_subscription_id: Optional[str] = None


# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResetPasswordRequest(BaseModel):
    token: str # This can be a verification session ID or same OTP/Email combo
    email: EmailStr
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


# Agent Login OTP Schemas
class SendLoginOTPRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyLoginOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class SendLoginOTPResponse(BaseModel):
    message: str
    email: str
    expires_in: int  # seconds


class LoginResponse(BaseModel):
    # For successful direct login (Customer/Admin)
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user: Optional[UserResponse] = None
    
    # For Agent OTP flow
    require_otp: bool = False
    message: Optional[str] = None
    email: Optional[str] = None
    expires_in: Optional[int] = None


class NotificationResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Sub-User Schemas ─────────────────────────────────────────────────────────

class SubUserPermissionIn(BaseModel):
    module: str  # dashboard | packages | activities | bookings | billing | finance_reports | settings
    access_level: str = "view"  # view | edit | full


class SubUserPermissionOut(SubUserPermissionIn):
    id: UUID4

    class Config:
        from_attributes = True


class SubUserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    role_label: str = Field("Custom", max_length=100)
    permissions: List[SubUserPermissionIn] = []

    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def sanitize_name(cls, v):
        if not isinstance(v, str):
            return v
        v = strip_xss(v).strip()
        reject_sql(v, 'name')
        return v

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError('Phone number must be 7–15 digits.')
        return v


class SubUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role_label: Optional[str] = None
    permissions: Optional[List[SubUserPermissionIn]] = None


class SubUserResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    agent_id: UUID4
    role_label: str
    is_active: bool
    created_at: datetime
    # Flattened from the linked User record
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: Optional[str] = None
    permissions: List[SubUserPermissionOut] = []

    class Config:
        from_attributes = True


class SubUserListResponse(BaseModel):
    sub_users: List[SubUserResponse]
    total: int

