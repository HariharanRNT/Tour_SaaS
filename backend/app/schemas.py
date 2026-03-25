"""Pydantic schemas for API request/response models"""
import json
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Union
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator
from app.models import UserRole, PackageStatus, BookingStatus, PaymentStatus, ApprovalStatus


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    domain: Optional[str] = None
    
    # Agent Specific
    agency_name: Optional[str] = None
    company_legal_name: Optional[str] = None
    business_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    gst_no: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = "INR"
    commission_type: Optional[str] = "percentage"
    commission_value: Optional[Decimal] = 0.0
    approval_status: Optional[ApprovalStatus] = ApprovalStatus.APPROVED


class UserUpdate(BaseModel):
    # Personal
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    
    # Agency
    agency_name: Optional[str] = None
    company_legal_name: Optional[str] = None
    domain: Optional[str] = None
    business_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Financial
    gst_no: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None
    commission_type: Optional[str] = None
    commission_value: Optional[Decimal] = None
    
    # Status
    is_active: Optional[bool] = None


class AgentRegistration(BaseModel):
    # Agency Details
    agency_name: str
    company_legal_name: str
    domain: str
    business_address: str
    country: str
    state: str
    city: str
    
    # Contact Details
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    
    # Credentials
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

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
    id: UUID4
    role: UserRole
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
    approval_status: ApprovalStatus
    email_verified: bool
    is_active: bool
    
    # Subscription Fields
    has_active_subscription: bool = False
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[date] = None
    
    created_at: datetime
    
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
    currency: Optional[str] = "INR"
    gst_applicable: Optional[bool] = False
    gst_inclusive: Optional[bool] = False
    gst_percentage: Optional[Decimal] = Decimal("18.00")

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
    agency_name: Optional[str] = None
    headline1: Optional[str] = None
    headline2: Optional[str] = None
    subheading: Optional[str] = None
    primaryBtnText: Optional[str] = None
    secondaryBtnText: Optional[str] = None
    backgroundImageUrl: Optional[str] = None
    navbar_logo_image: Optional[str] = None
    badgeText: Optional[str] = None
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
    plan_trip_heading: Optional[str] = None
    plan_trip_italic: Optional[str] = None
    plan_trip_subheading: Optional[str] = None
    plan_trip_placeholder: Optional[str] = None
    plan_trip_button_text: Optional[str] = None
    plan_trip_stats_text: Optional[str] = None
    plan_trip_categories: Optional[List[str]] = None
    plan_trip_section_heading: Optional[str] = None
    plan_trip_section_subtext: Optional[str] = None
    destinations_heading: Optional[str] = None
    destinations_subtext: Optional[str] = None
    destinations_link_text: Optional[str] = None
    destinations_cta_text: Optional[str] = None
    # UI Toggles and other page settings
    show_category_pills: Optional[bool] = None
    show_stat_bar: Optional[bool] = None
    packages_title: Optional[str] = None
    packages_subtitle: Optional[str] = None
    show_best_seller_badge: Optional[bool] = None
    show_top_rated_badge: Optional[bool] = None
    show_wishlist: Optional[bool] = None
    show_ai_optimized_badge: Optional[bool] = None
    ai_optimized_text: Optional[str] = None
    morning_label: Optional[str] = None
    afternoon_label: Optional[str] = None
    evening_label: Optional[str] = None
    night_label: Optional[str] = None
    show_activity_images: Optional[bool] = None
    cart_summary_title: Optional[str] = None
    cart_cta_text: Optional[str] = None
    show_gst_breakdown: Optional[bool] = None
    show_per_person: Optional[bool] = None
    show_verified_badge: Optional[bool] = None
    show_support_badge: Optional[bool] = None
    show_flexible_badge: Optional[bool] = None
    modal_cta_text: Optional[str] = None
    package_cta_text: Optional[str] = None
    # Design File Alignment
    buttonStyle: Optional[dict] = None
    navbarSettings: Optional[dict] = None
    layoutChoices: Optional[dict] = None
    
    # Audit requested color variables (legacy compatibility items)
    nav_bg: Optional[str] = None
    button_color: Optional[str] = None
    bg_color: Optional[str] = None
    accent_color: Optional[str] = None
    font_size: Optional[str] = None
    font_family: Optional[str] = None
    
    # Email Settings
    default_email_theme: Optional[str] = None
    default_email_message: Optional[str] = None


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
    max_bookings: int = 10
    is_blackout: bool = False


class PackageAvailabilityResponse(PackageAvailabilityBase):
    id: UUID4
    current_bookings: int
    
    class Config:
        from_attributes = True


class PackageBase(BaseModel):
    title: str
    description: str
    destination: str
    country: Optional[str] = None
    duration_days: int
    duration_nights: int
    trip_style: Optional[str] = None
    price_per_person: Decimal
    max_group_size: int = 20
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
    flight_baggage_note: Optional[str] = None
    # Cancellation Policy
    cancellation_enabled: bool = False
    cancellation_rules: List[dict] = []


class PackageCreate(PackageBase):
    country: str  # Mandatory on creation
    is_public: bool = True
    itinerary_items: List[ItineraryItemBase] = []
    availability: List[PackageAvailabilityBase] = []


class PackageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    trip_style: Optional[str] = None
    price_per_person: Optional[Decimal] = None
    max_group_size: Optional[int] = None
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
    flight_baggage_note: Optional[str] = None
    # Cancellation Policy
    cancellation_enabled: Optional[bool] = None
    cancellation_rules: Optional[List[dict]] = None


class PackageResponse(PackageBase):
    id: UUID4
    slug: str
    status: PackageStatus
    is_public: bool
    created_at: datetime
    images: List[PackageImageResponse] = []
    itinerary_items: List[ItineraryItemResponse] = []
    availability: List[PackageAvailabilityResponse] = []
    
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
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    passport_number: Optional[str] = None
    nationality: str
    is_primary: bool = False


class TravelerResponse(TravelerBase):
    id: UUID4
    
    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    package_id: UUID4
    travel_date: date
    number_of_travelers: int = Field(..., ge=1)
    travelers: List[TravelerBase]
    special_requests: Optional[str] = None
    customer_id: Optional[UUID4] = None


class BookingResponse(BaseModel):
    id: UUID4
    booking_reference: str
    package_id: Optional[UUID4] = None
    user_id: UUID4
    travel_date: date
    number_of_travelers: int
    total_amount: Decimal
    status: BookingStatus
    payment_status: PaymentStatus
    special_requests: Optional[str] = None
    tripjack_booking_id: Optional[str] = None
    # Cancellation / Refund fields
    refund_amount: Optional[Decimal] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
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
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    image_url: Optional[Union[str, List[str]]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = "INR"
    activities: Optional[List[str]] = []
    meals_included: Optional[List[str]] = []
    display_order: int = 0
    rating: Optional[float] = None
    location: Optional[str] = None

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
