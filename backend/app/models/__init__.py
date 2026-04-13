"""Database models"""
import enum
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Column, String, Boolean, Integer, Text, Date, DateTime, Numeric, Float,
    ForeignKey, Enum as SQLEnum, ARRAY, text, JSON, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# Enums
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    AGENT = "AGENT"
    CUSTOMER = "CUSTOMER"
    SUB_USER = "SUB_USER"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PackageStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class BookingStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class BookingType(str, enum.Enum):
    INSTANT = "INSTANT"
    ENQUIRY = "ENQUIRY"


class EnquiryPaymentType(str, enum.Enum):
    OFFLINE = "OFFLINE"
    PAYMENT_LINK = "PAYMENT_LINK"


class EnquiryStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


# Helper function to generate UUID as string
def generate_uuid():
    return str(uuid.uuid4())


# Models
# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole, native_enum=False), default=UserRole.CUSTOMER, nullable=False)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    approval_status = Column(SQLEnum(ApprovalStatus, native_enum=False), default=ApprovalStatus.APPROVED, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Google Auth
    google_id = Column(String, unique=True, index=True, nullable=True)
    profile_picture_url = Column(String, nullable=True)

    # Proxy Properties
    @property
    def profile(self):
        return self.admin_profile or self.agent_profile or self.customer_profile or self.sub_user_profile
        
    @property
    def first_name(self):
        return self.profile.first_name if self.profile else ""
        
    @property
    def last_name(self):
        return self.profile.last_name if self.profile else ""
        
    @property
    def phone(self):
        return getattr(self.profile, 'phone', None) if self.profile else None
        
    @property
    def domain(self):
        if self.role == UserRole.SUB_USER:
            # We assume sub_user_agent_domain was attached or we resolve it
            if hasattr(self, '_sub_user_agent_domain'):
                return self._sub_user_agent_domain
        return getattr(self.profile, 'domain', None) if self.profile else None

    @property
    def agent_id(self):
        if self.role == UserRole.AGENT:
            return self.id
        # Fallback to profile (for Customer or SubUser)
        return getattr(self.profile, 'agent_id', None) if self.profile else None

    # Agent Specific Proxies
    @property
    def agency_name(self):
        return getattr(self.profile, 'agency_name', None) if self.profile else None
        
    @property
    def company_legal_name(self):
        return getattr(self.profile, 'company_legal_name', None) if self.profile else None

    @property
    def business_address(self):
        return getattr(self.profile, 'business_address', None) if self.profile else None

    @property
    def city(self):
        return getattr(self.profile, 'city', None) if self.profile else None

    @property
    def state(self):
        return getattr(self.profile, 'state', None) if self.profile else None

    @property
    def country(self):
        return getattr(self.profile, 'country', None) if self.profile else None

    @property
    def gst_no(self):
        return getattr(self.profile, 'gst_no', None) if self.profile else None
        
    @property
    def commission_type(self):
        return getattr(self.profile, 'commission_type', None) if self.profile else None
        
    @property
    def commission_value(self):
        return getattr(self.profile, 'commission_value', None) if self.profile else None
    
    @property
    def subscription_status(self):
        if not self.subscription:
            return None
        return self.subscription.status

    @property
    def subscription_end_date(self):
        if not self.subscription:
            return None
        return self.subscription.end_date

    @property
    def sub_user_id(self):
        return self.sub_user_profile.id if self.sub_user_profile else None

    @property
    def permissions(self):
        # We might have attached them in deps.py
        if hasattr(self, '_sub_user_permissions'):
            return self._sub_user_permissions
        # Otherwise load from database
        try:
            if self.role == UserRole.SUB_USER and self.sub_user_profile and self.sub_user_profile.permissions:
                return [
                    {"module": p.module, "access_level": p.access_level}
                    for p in self.sub_user_profile.permissions
                ]
        except Exception:
            # Fallback if permissions are not loaded and session is closed
            pass
        return []

    @property
    def has_active_subscription(self):
        # Target the user themselves, or their parent agent if they are a sub-user
        target = self
        if self.role == UserRole.SUB_USER and self.sub_user_profile and self.sub_user_profile.agent:
            target = self.sub_user_profile.agent
            
        if not target.subscription or target.subscription.status != 'active':
            return False
        
        from datetime import date
        return target.subscription.end_date >= date.today()
    
    # Relationships
    subscription = relationship(
        "Subscription", 
        primaryjoin="and_(User.id==Subscription.user_id, Subscription.status=='active')",
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan", 
        order_by="desc(Subscription.end_date), desc(Subscription.created_at)", 
        lazy="selectin"
    )
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id", cascade="all, delete-orphan")
    created_packages = relationship("Package", back_populates="creator")
    
    # Profile Relationships
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    agent_profile = relationship("Agent", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    customer_profile = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="Customer.user_id", lazy="selectin")
    
    # Subscription & Billing Relationships
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sub_user_profile = relationship("SubUser", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="SubUser.user_id", lazy="selectin")


class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    
    user = relationship("User", back_populates="admin_profile")


class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    domain = Column(String, nullable=True, index=True)
    
    # Business Details
    agency_name = Column(String, nullable=True)
    company_legal_name = Column(String, nullable=True)
    business_address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    gst_no = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    
    # Settings
    currency = Column(String, default="INR")
    commission_type = Column(String, default="percentage") # percentage, fixed
    commission_value = Column(Numeric(10, 2), default=0.0)
    gst_applicable = Column(Boolean, default=False)
    gst_inclusive = Column(Boolean, default=False)
    gst_percentage = Column(Numeric(5, 2), default=18.00)
    
    # SMTP Settings (Encrypted/Stored)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True) # Should be encrypted in application layer
    smtp_from_email = Column(String, nullable=True)
    
    # Homepage Customization
    homepage_settings = Column(JSON, nullable=True) # Stores headline, hero, cards, WCU, styles
    
    # Relationships
    smtp_settings = relationship("AgentSMTPSettings", back_populates="agent", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    razorpay_settings = relationship("AgentRazorpaySettings", back_populates="agent", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    # theme = relationship("AgentTheme", back_populates="agent", cascade="all, delete-orphan", lazy="selectin")

    user = relationship("User", back_populates="agent_profile")


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    
    # Associated Agent (The agent who owns this customer relationship)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    user = relationship("User", back_populates="customer_profile", foreign_keys=[user_id])
    agent = relationship("User", foreign_keys=[agent_id], lazy="selectin")


class Package(Base):
    __tablename__ = "packages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    destination = Column(String, nullable=False, index=True)
    duration_days = Column(Integer, nullable=False, index=True)
    duration_nights = Column(Integer, nullable=False)
    trip_style = Column(String, index=True)
    category = Column(String, index=True, nullable=True) # e.g., Adventure, Honeymoon, etc.
    price_per_person = Column(Numeric(10, 2), nullable=False, index=True)
    max_group_size = Column(Integer, default=20)
    included_items = Column(Text, default="[]")  # JSON string
    excluded_items = Column(Text, default="[]")  # JSON string
    status = Column(SQLEnum(PackageStatus), default=PackageStatus.DRAFT, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Dual Booking Fields
    booking_type = Column(SQLEnum(BookingType, native_enum=False), default=BookingType.INSTANT, nullable=False)
    price_label = Column(String, nullable=True)
    enquiry_payment = Column(SQLEnum(EnquiryPaymentType, native_enum=False), default=EnquiryPaymentType.OFFLINE, nullable=False)
    
    # Enhanced Fields
    country = Column(String, index=True, nullable=True) # Making nullable first for migration, will validate in API
    is_public = Column(Boolean, default=True, index=True)
    # Multi-Destination and Type Fields
    package_mode = Column(String, default="single") # single, multi
    destinations = Column(Text, default="[]") # JSON string for multi-dest legs
    activities = Column(Text, default="[]") # JSON string for activity tags
    
    # Template fields
    is_template = Column(Boolean, default=False)
    template_destination = Column(String(255), nullable=True)
    template_max_days = Column(Integer, default=15)
    
    # Trip planner fields
    is_popular_destination = Column(Boolean, default=False)
    feature_image_url = Column(String, nullable=True)
    view_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # GST Configuration (per-package; NULL = use agent-level defaults from Settings)
    gst_applicable = Column(Boolean, default=None, nullable=True)
    gst_percentage = Column(Numeric(5, 2), default=None, nullable=True)
    gst_mode = Column(String(20), default=None, nullable=True)  # 'inclusive' or 'exclusive'
    
    # Cancellation Policy
    cancellation_enabled = Column(Boolean, default=False)
    cancellation_rules   = Column(JSON, default=list)  # [{daysBefore, refundPercentage}] — stored pre-sorted descending

    # SEO Fields
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    meta_keywords = Column(String, nullable=True)

    # Flight inclusion configuration
    flights_enabled = Column(Boolean, default=False)
    flight_origin_cities = Column(Text, default="[]") # JSON list of codes (e.g. ["MAA", "BOM"])
    flight_cabin_class = Column(String(20), default="ECONOMY") # ECONOMY, BUSINESS
    flight_price_included = Column(Boolean, default=False)
    flight_baggage_note = Column(Text, nullable=True)

    @property
    def destination_image_url(self) -> Optional[str]:
        if not self.dest_metadata:
            return None
        if isinstance(self.dest_metadata, list):
            return self.dest_metadata[0].image_url if len(self.dest_metadata) > 0 else None
        return getattr(self.dest_metadata, 'image_url', None)

    
    # Relationships
    creator = relationship("User", back_populates="created_packages", foreign_keys=[created_by])
    images = relationship("PackageImage", back_populates="package", cascade="all, delete-orphan")
    itinerary_items = relationship("ItineraryItem", back_populates="package", cascade="all, delete-orphan", order_by="ItineraryItem.day_number")
    availability = relationship("PackageAvailability", back_populates="package", cascade="all, delete-orphan", lazy="selectin")
    bookings = relationship("Booking", back_populates="package")
    dest_metadata = relationship("Destination", back_populates="packages", primaryjoin="Package.destination == Destination.name", foreign_keys="[Package.destination]", viewonly=True)


class Destination(Base):
    __tablename__ = "popular_destinations" # Re-use existing table name for simplicity or we can migrate later
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    country = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    is_popular = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True) # Added to match trip_planner.py query
    display_order = Column(Integer, default=999) # Added to match trip_planner.py query
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    packages = relationship("Package", back_populates="dest_metadata", primaryjoin="Destination.name == Package.destination", foreign_keys="[Package.destination]", viewonly=True)


class PackageImage(Base):
    __tablename__ = "package_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    package = relationship("Package", back_populates="images")


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)  # Single image URL
    activities = Column(Text, default="[]")  # JSON string
    meals_included = Column(Text, default="[]")  # JSON string
    
    # Template fields
    time_slot = Column(String(20), nullable=True)  # morning, afternoon, evening, night, full_day
    start_time = Column(String(20), nullable=True)  # e.g. "09:00"
    end_time = Column(String(20), nullable=True)    # e.g. "11:00"
    is_optional = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    
    # Relationships
    package = relationship("Package", back_populates="itinerary_items")


class PackageAvailability(Base):
    __tablename__ = "package_availability"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False)
    available_from = Column(Date, nullable=False)
    available_to = Column(Date, nullable=False)
    max_bookings = Column(Integer, default=10)
    current_bookings = Column(Integer, default=0)
    is_blackout = Column(Boolean, default=False)
    
    # Relationships
    package = relationship("Package", back_populates="availability")


class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_reference = Column(String, unique=True, index=True, nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # Agent who owns this booking
    booking_date = Column(Date, nullable=False, default=func.current_date())
    travel_date = Column(Date, nullable=False, index=True)
    number_of_travelers = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False, index=True)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    special_requests = Column(Text, nullable=True)
    tripjack_booking_id = Column(String(50), nullable=True)
    enquiry_id = Column(UUID(as_uuid=True), ForeignKey("enquiries.id"), nullable=True, unique=True)
    
    # Flight selection details (for booking intent)
    flight_origin = Column(String(50), nullable=True)
    flight_fare = Column(Numeric(10, 2), nullable=True)
    flight_details = Column(Text, nullable=True) # JSON with airline, flight_no, dep/arr times

    # Agent-on-behalf tracking
    booked_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Cancellation / Refund
    refund_amount = Column(Numeric(10, 2), nullable=True)
    cancelled_at  = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    package = relationship("Package", back_populates="bookings", lazy="selectin")
    user = relationship("User", back_populates="bookings", foreign_keys=[user_id], lazy="selectin")
    agent = relationship("User", foreign_keys=[agent_id], lazy="selectin")
    booked_by = relationship("User", foreign_keys=[booked_by_user_id], lazy="selectin")
    travelers = relationship("Traveler", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    refund = relationship("BookingRefund", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    enquiry = relationship("Enquiry", back_populates="booking", uselist=False)


class Traveler(Base):
    __tablename__ = "travelers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String, nullable=False)
    passport_number = Column(String, nullable=True)
    nationality = Column(String, nullable=False)
    type = Column(String, nullable=True) # ADULT, CHILD, INFANT
    is_primary = Column(Boolean, default=False)
    
    # Relationships
    booking = relationship("Booking", back_populates="travelers")


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Booking ID is now nullable to support subscription payments
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    
    razorpay_order_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_payment_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="INR")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    payment_method = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")


class BookingRefund(Base):
    """Tracks Razorpay refunds for cancelled bookings."""
    __tablename__ = "booking_refunds"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # unique=True enforces idempotency — only one refund record per booking
    booking_id          = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_refund_id  = Column(String, nullable=True)
    refund_amount       = Column(Numeric(10, 2), nullable=False)
    refund_percentage   = Column(Numeric(5, 2), nullable=True)
    days_before         = Column(Integer, nullable=True)
    # Status: initiated → succeeded | failed | pending (manual retry when Razorpay is unreachable)
    status              = Column(String, default="initiated")
    failure_reason      = Column(Text, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    booking = relationship("Booking", back_populates="refund")


# Itinerary Planning Models
from app.models.itinerary import ItineraryCart


# User Itinerary Models (Template-based)
class UserItinerary(Base):
    """
    User's itinerary instance created from a template
    Stores user-specific trip planning data
    """
    __tablename__ = "user_itineraries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    template_package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=True)
    destination = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    num_days = Column(Integer, nullable=False)
    status = Column(String(50), default="draft")  # draft, confirmed, booked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    template = relationship("Package", foreign_keys=[template_package_id])
    activities = relationship("UserItineraryActivity", back_populates="itinerary", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UserItinerary(id={self.id}, destination={self.destination}, user_id={self.user_id})>"


class UserItineraryActivity(Base):
    """
    Individual activity in a user's itinerary
    Can be from template or custom-added by user
    """
    __tablename__ = "user_itinerary_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_itinerary_id = Column(UUID(as_uuid=True), ForeignKey("user_itineraries.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    time_slot = Column(String(20), nullable=False)  # morning, afternoon, evening, night
    
    # Activity details (snapshot at time of adding)
    activity_id = Column(String(255), nullable=True)  # External ID or UUID
    activity_title = Column(String(255), nullable=False)
    activity_description = Column(Text, nullable=True)
    activity_price = Column(Numeric(10, 2), nullable=True)
    activity_duration = Column(String(50), nullable=True)
    activity_images = Column(ARRAY(String), nullable=True)
    
    # Metadata
    is_from_template = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    itinerary = relationship("UserItinerary", back_populates="activities")
    
    def __repr__(self):
        return f"<UserItineraryActivity(id={self.id}, day={self.day_number}, slot={self.time_slot})>"


class Activity(Base):
    """
    Reusable activity template for the Activity Master
    """
    __tablename__ = "activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    destination_city = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    duration_hours = Column(Float, nullable=False)
    time_slot_preference = Column(String, nullable=False) # morning, afternoon, evening, full_day
    description = Column(Text, nullable=True)
    price_per_person = Column(Numeric(10, 2), nullable=True)
    
    # Optional agent ownership - if null, it's a platform-wide generic activity
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    agent = relationship("User", foreign_keys=[agent_id])
    images = relationship("ActivityImage", back_populates="activity", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Activity(id={self.id}, name={self.name}, city={self.destination_city})>"


class ActivityImage(Base):
    __tablename__ = "activity_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    activity = relationship("Activity", back_populates="images")


# Booking Customization Models (Package System)
class BookingCustomization(Base):
    """
    Customizations made to package itinerary during booking
    Tracks removed default activities and custom additions
    """
    __tablename__ = "booking_customizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    time_slot = Column(String(20), nullable=True)  # morning, afternoon, evening, night
    
    # Activity details
    activity_title = Column(String(255), nullable=False)
    activity_description = Column(Text, nullable=True)
    activity_price = Column(Numeric(10, 2), nullable=True)
    
    # Customization metadata
    is_removed = Column(Boolean, default=False)  # User removed this default activity
    is_custom = Column(Boolean, default=False)   # User added this custom activity
    original_item_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_items.id"), nullable=True)
    
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    booking = relationship("Booking")
    original_item = relationship("ItineraryItem", foreign_keys=[original_item_id])
    
    
    def __repr__(self):
        return f"<BookingCustomization(id={self.id}, booking={self.booking_id}, day={self.day_number})>"


# Trip Planning Session Model
class TripPlanningSession(Base):
    __tablename__ = "trip_planning_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    destination = Column(String, nullable=False)
    duration_days = Column(Integer, nullable=False)
    duration_nights = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    travelers = Column(Text, nullable=False)  # JSON
    preferences = Column(Text, nullable=False)  # JSON
    matched_package_id = Column(UUID(as_uuid=True), nullable=True)
    itinerary = Column(Text, nullable=False)  # JSON
    flight_details = Column(Text, nullable=True)  # JSON
    status = Column(String, default='active', nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), server_default=text("NOW() + INTERVAL '24 hours'"))


# Subscription Models
class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True) # Starter, Professional, Enterprise
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="INR")
    billing_cycle = Column(String, default="monthly") # monthly, quarterly, yearly, custom
    duration_days = Column(Integer, nullable=True) # Used for 'custom' cycle
    features = Column(Text, default="[]") # JSON list of features
    booking_limit = Column(Integer, nullable=False) # -1 for unlimited
    is_active = Column(Boolean, default=True)
    razorpay_plan_id = Column(String, nullable=True) # External Plan ID from Razorpay
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String, default="active") # active, expired, cancelled, trial
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    current_bookings_usage = Column(Integer, default=0)
    auto_renew = Column(Boolean, default=True)
    
    # Razorpay Auto-Renewal Fields
    razorpay_subscription_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_payment_id = Column(String, nullable=True) # Latest successful payment ID
    
    grace_period_ends_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan")
    payments = relationship("Payment", back_populates="subscription")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String, default="pending") # paid, pending, overdue
    issue_date = Column(Date, nullable=False, default=func.current_date())
    due_date = Column(Date, nullable=False)
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="invoices")
    subscription = relationship("Subscription")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False) # alert, info, success, warning
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

class NotificationLog(Base):
    """Tracks the status of automated email/sms sent to users"""
    __tablename__ = "notification_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, nullable=False) # e.g. 'booking_confirmation', 'payment_receipt'
    status = Column(String, default="pending") # pending, sent, failed
    error = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to booking if applicable
    booking = relationship("Booking")


class Settlement(Base):
    """Tracks Razorpay Settlements"""
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    settlement_id = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    utr = Column(String, nullable=True)
    description = Column(String, nullable=True)
    entity_id = Column(String, nullable=True) # Linked payment/order ID
    created_at = Column(DateTime(timezone=True), nullable=False) # Copied from Razorpay event


class Enquiry(Base):
    __tablename__ = "enquiries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    package_name_snapshot = Column(String, nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    customer_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    travel_date = Column(Date, nullable=False)
    travellers = Column(Integer, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(SQLEnum(EnquiryStatus, native_enum=False), default=EnquiryStatus.NEW, nullable=False, index=True)
    source = Column(String, default="WEB", nullable=False)
    agent_notes = Column(Text, nullable=True)
    agent_notified = Column(Boolean, default=True)
    notification_count = Column(Integer, default=1)
    last_contacted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint('travellers > 0', name='ck_enquiry_travellers_positive'),
    )
    
    # Relationships
    package = relationship("Package")
    agent = relationship("User", foreign_keys=[agent_id])
    customer = relationship("User", foreign_keys=[customer_id])
    booking = relationship("Booking", back_populates="enquiry", uselist=False)


class WebhookEvent(Base):
    """Idempotency tracking for Razorpay Webhooks"""
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razorpay_event_id = Column(String, unique=True, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="processed") # processed, failed, skipped


# Agent Settings Models
class AgentSMTPSettings(Base):
    __tablename__ = "agent_smtp_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False) # Encrypted
    encryption_type = Column(String, default="tls") # tls, ssl, none
    from_email = Column(String, nullable=False)
    from_name = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    agent = relationship("Agent", back_populates="smtp_settings")


class AgentRazorpaySettings(Base):
    __tablename__ = "agent_razorpay_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    key_id = Column(String, nullable=False)
    key_secret = Column(String, nullable=False) # Encrypted
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    agent = relationship("Agent", back_populates="razorpay_settings")


class UserOTP(Base):
    __tablename__ = "user_otps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp_hash = Column(String, nullable=False)
    purpose = Column(String, default="password_reset") # password_reset, email_verification
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


# class AgentTheme(Base):
#     __tablename__ = "agent_themes"
# ... (rest of the class)


class SubUser(Base):
    """
    Sub-users created by an Agent to delegate access.
    They share the same login page; their dashboard is filtered by permissions.
    """
    __tablename__ = "sub_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # The auth User record for this sub-user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # The parent agent whose data this sub-user can access
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Human-readable role preset label
    role_label = Column(String(64), default="Custom")  # Package Manager | Finance Manager | Report Viewer | Custom
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    agent = relationship("User", foreign_keys=[agent_id], lazy="selectin")
    permissions = relationship("SubUserPermission", back_populates="sub_user", cascade="all, delete-orphan", lazy="selectin")


class SubUserPermission(Base):
    """
    Per-module access grants for a SubUser.
    module: dashboard | packages | activities | bookings | billing | finance_reports | settings
    access_level: view | edit | full
    """
    __tablename__ = "sub_user_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sub_user_id = Column(UUID(as_uuid=True), ForeignKey("sub_users.id", ondelete="CASCADE"), nullable=False, index=True)
    module = Column(String(64), nullable=False)
    access_level = Column(String(16), default="view")  # view | edit | full

    __table_args__ = (UniqueConstraint("sub_user_id", "module", name="uq_subuser_module"),)

    # Relationships
    sub_user = relationship("SubUser", back_populates="permissions")
