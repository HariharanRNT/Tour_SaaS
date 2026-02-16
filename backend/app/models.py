"""Database models"""
import enum
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, String, Boolean, Integer, Text, Date, DateTime, Numeric,
    ForeignKey, Enum as SQLEnum, ARRAY, text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"
    CUSTOMER = "customer"


class PackageStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


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
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Proxy Properties
    @property
    def profile(self):
        return self.admin_profile or self.agent_profile or self.customer_profile
        
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
        return getattr(self.profile, 'domain', None) if self.profile else None

    @property
    def agent_id(self):
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
    
    # Relationships
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id", cascade="all, delete-orphan")
    created_packages = relationship("Package", back_populates="creator")
    
    # Profile Relationships
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    agent_profile = relationship("Agent", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    customer_profile = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="Customer.user_id", lazy="selectin")
    
    # Subscription & Billing Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


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
    
    # SMTP Settings (Encrypted/Stored)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True) # Should be encrypted in application layer
    smtp_from_email = Column(String, nullable=True)
    
    # Relationships
    smtp_settings = relationship("AgentSMTPSettings", back_populates="agent", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    razorpay_settings = relationship("AgentRazorpaySettings", back_populates="agent", uselist=False, cascade="all, delete-orphan", lazy="selectin")

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
    duration_days = Column(Integer, nullable=False)
    duration_nights = Column(Integer, nullable=False)
    category = Column(String, index=True)
    price_per_person = Column(Numeric(10, 2), nullable=False)
    max_group_size = Column(Integer, default=20)
    included_items = Column(Text, default="[]")  # JSON string
    excluded_items = Column(Text, default="[]")  # JSON string
    status = Column(SQLEnum(PackageStatus), default=PackageStatus.DRAFT, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Enhanced Fields
    country = Column(String, index=True, nullable=True) # Making nullable first for migration, will validate in API
    is_public = Column(Boolean, default=True, index=True)
    
    # Template fields
    is_template = Column(Boolean, default=False)
    template_destination = Column(String(255), nullable=True)
    template_max_days = Column(Integer, default=15)
    
    # Trip planner fields
    is_popular_destination = Column(Boolean, default=False)
    feature_image_url = Column(String, nullable=True)
    view_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="created_packages", foreign_keys=[created_by])
    images = relationship("PackageImage", back_populates="package", cascade="all, delete-orphan")
    itinerary_items = relationship("ItineraryItem", back_populates="package", cascade="all, delete-orphan", order_by="ItineraryItem.day_number")
    availability = relationship("PackageAvailability", back_populates="package", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="package")


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
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Agent who owns this booking
    booking_date = Column(Date, nullable=False, default=func.current_date())
    travel_date = Column(Date, nullable=False)
    number_of_travelers = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    special_requests = Column(Text, nullable=True)
    tripjack_booking_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    package = relationship("Package", back_populates="bookings", lazy="selectin")
    user = relationship("User", back_populates="bookings", foreign_keys=[user_id], lazy="selectin")
    agent = relationship("User", foreign_keys=[agent_id], lazy="selectin")
    travelers = relationship("Traveler", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")


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
    is_primary = Column(Boolean, default=False)
    
    # Relationships
    booking = relationship("Booking", back_populates="travelers")


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Booking ID is now nullable to support subscription payments
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    
    razorpay_order_id = Column(String, unique=True, index=True)
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


# Itinerary Planning Models
class ItineraryCart(Base):
    """
    Cart-level storage for itineraries
    Stores the entire itinerary as JSON for flexibility
    """
    __tablename__ = "itinerary_carts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Trip details
    destination = Column(String(255), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    total_days = Column(Integer, nullable=False)
    
    # Itinerary data stored as JSON
    itinerary_data = Column(ARRAY(String), nullable=False)  # Using ARRAY temporarily, will use JSON in production
    
    # Pricing
    total_price = Column(Numeric(10, 2), nullable=False, default=0.0)
    currency = Column(String(3), nullable=False, default="USD")
    
    # Cart management
    status = Column(String(20), default="active")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Validation snapshot
    last_validated_at = Column(DateTime(timezone=True))
    validation_result = Column(Text)  # JSON string
    
    # User preferences
    preferences = Column(Text)  # JSON string
    
    def __repr__(self):
        return f"<ItineraryCart(id={self.id}, destination={self.destination}, status={self.status})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if cart has expired"""
        from datetime import datetime
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_active(self) -> bool:
        """Check if cart is active and not expired"""
        return self.status == "active" and not self.is_expired
    
    @staticmethod
    def create_expiry_time(hours: int = 24):
        """Create expiry timestamp"""
        from datetime import datetime, timedelta
        return datetime.utcnow() + timedelta(hours=hours)


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
