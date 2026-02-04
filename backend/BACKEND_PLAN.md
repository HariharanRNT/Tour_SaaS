# Tour SaaS Backend - FastAPI Implementation Plan

## Project Overview

This document outlines the backend implementation for the Tour SaaS B2C portal using **FastAPI** with **Razorpay** payment integration. The backend will be a standalone REST API with comprehensive Swagger documentation.

---

## Technology Stack

### Core Framework
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **ASGI Server**: Uvicorn
- **API Documentation**: Swagger UI (built-in) + ReDoc

### Database & ORM
- **Primary Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Connection Pool**: asyncpg

### Caching & Queue
- **Cache**: Redis 7+
- **Session Store**: Redis
- **Task Queue**: Celery + Redis (for async tasks)

### Authentication & Security
- **Authentication**: JWT (python-jose)
- **Password Hashing**: passlib with bcrypt
- **OAuth2**: FastAPI OAuth2PasswordBearer
- **CORS**: FastAPI CORS middleware
- **Rate Limiting**: slowapi

### Payment Gateway
- **Payment Provider**: Razorpay
- **SDK**: razorpay-python

### Email & Notifications
- **Email Service**: AWS SES / SendGrid
- **Email Templates**: Jinja2
- **SMTP Client**: aiosmtplib (async)

### File Storage
- **Storage**: AWS S3 / Cloudinary
- **SDK**: boto3 (AWS) / cloudinary-python

### Validation & Serialization
- **Data Validation**: Pydantic v2
- **Schema Validation**: Built-in with FastAPI

### Testing
- **Testing Framework**: pytest + pytest-asyncio
- **HTTP Testing**: httpx
- **Coverage**: pytest-cov

### DevOps & Monitoring
- **Containerization**: Docker
- **Process Manager**: Gunicorn + Uvicorn workers
- **Logging**: Python logging + structlog
- **Monitoring**: Sentry (error tracking)
- **Environment**: python-dotenv

---

## Project Structure

```
tour-saas-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection and session
│   │
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies (auth, db session)
│   │   └── v1/                 # API version 1
│   │       ├── __init__.py
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── packages.py     # Package endpoints
│   │       ├── bookings.py     # Booking endpoints
│   │       ├── payments.py     # Payment endpoints
│   │       └── users.py        # User endpoints
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── package.py
│   │   ├── booking.py
│   │   ├── payment.py
│   │   └── traveler.py
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── package.py
│   │   ├── booking.py
│   │   ├── payment.py
│   │   └── common.py
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── package_service.py
│   │   ├── booking_service.py
│   │   ├── payment_service.py
│   │   ├── email_service.py
│   │   └── storage_service.py
│   │
│   ├── core/                   # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py         # JWT, password hashing
│   │   ├── config.py           # Settings management
│   │   └── exceptions.py       # Custom exceptions
│   │
│   └── utils/                  # Helper functions
│       ├── __init__.py
│       ├── email_templates.py
│       └── validators.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_packages.py
│   ├── test_bookings.py
│   └── test_payments.py
│
├── scripts/                    # Utility scripts
│   ├── seed_data.py
│   └── create_admin.py
│
├── .env.example                # Environment variables template
├── .gitignore
├── alembic.ini                 # Alembic configuration
├── docker-compose.yml          # Docker setup
├── Dockerfile
├── pyproject.toml              # Poetry dependencies
├── pytest.ini                  # Pytest configuration
└── README.md
```

---

## Database Schema (SQLAlchemy Models)

### User Model
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bookings = relationship("Booking", back_populates="user")
```

### Package Model
```python
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
    included_items = Column(ARRAY(String))
    excluded_items = Column(ARRAY(String))
    status = Column(Enum(PackageStatus), default=PackageStatus.DRAFT)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    images = relationship("PackageImage", back_populates="package", cascade="all, delete-orphan")
    itinerary_items = relationship("ItineraryItem", back_populates="package", cascade="all, delete-orphan")
    availability = relationship("PackageAvailability", back_populates="package", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="package")
```

### Booking Model
```python
class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_reference = Column(String, unique=True, index=True, nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    booking_date = Column(Date, nullable=False)
    travel_date = Column(Date, nullable=False)
    number_of_travelers = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    package = relationship("Package", back_populates="bookings")
    user = relationship("User", back_populates="bookings")
    travelers = relationship("Traveler", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
```

### Payment Model
```python
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    razorpay_order_id = Column(String, unique=True, index=True)
    razorpay_payment_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="INR")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
```

---

## API Endpoints (FastAPI Routes)

### Authentication Endpoints (`/api/v1/auth`)

```python
POST   /api/v1/auth/register          # User registration
POST   /api/v1/auth/login             # User login (returns JWT)
POST   /api/v1/auth/logout            # User logout (invalidate token)
POST   /api/v1/auth/refresh           # Refresh JWT token
POST   /api/v1/auth/forgot-password   # Request password reset
POST   /api/v1/auth/reset-password    # Reset password with token
GET    /api/v1/auth/me                # Get current user info
POST   /api/v1/auth/verify-email      # Verify email address
```

### Package Endpoints (`/api/v1/packages`)

```python
GET    /api/v1/packages               # List packages (with filters, pagination)
GET    /api/v1/packages/{id}          # Get package details
POST   /api/v1/packages               # Create package (Admin only)
PUT    /api/v1/packages/{id}          # Update package (Admin only)
DELETE /api/v1/packages/{id}          # Delete package (Admin only)
POST   /api/v1/packages/{id}/images   # Upload package images
DELETE /api/v1/packages/{id}/images/{image_id}  # Delete image
GET    /api/v1/packages/search        # Search packages
GET    /api/v1/packages/featured      # Get featured packages
```

### Booking Endpoints (`/api/v1/bookings`)

```python
GET    /api/v1/bookings               # List user bookings
GET    /api/v1/bookings/{id}          # Get booking details
POST   /api/v1/bookings               # Create booking
PUT    /api/v1/bookings/{id}/cancel   # Cancel booking
GET    /api/v1/bookings/{id}/voucher  # Download booking voucher (PDF)
GET    /api/v1/admin/bookings         # List all bookings (Admin)
PUT    /api/v1/admin/bookings/{id}    # Update booking status (Admin)
```

### Payment Endpoints (`/api/v1/payments`)

```python
POST   /api/v1/payments/create-order  # Create Razorpay order
POST   /api/v1/payments/verify        # Verify Razorpay payment signature
POST   /api/v1/payments/webhook       # Razorpay webhook handler
GET    /api/v1/payments/{id}          # Get payment details
POST   /api/v1/payments/{id}/refund   # Process refund (Admin)
```

### User Endpoints (`/api/v1/users`)

```python
GET    /api/v1/users/profile          # Get user profile
PUT    /api/v1/users/profile          # Update user profile
PUT    /api/v1/users/change-password  # Change password
GET    /api/v1/admin/users            # List all users (Admin)
PUT    /api/v1/admin/users/{id}       # Update user (Admin)
DELETE /api/v1/admin/users/{id}       # Delete user (Admin)
```

---

## Razorpay Integration

### Payment Service
```python
# app/services/payment_service.py
import razorpay
from app.core.config import settings

razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

async def create_razorpay_order(amount: Decimal, currency: str = "INR", receipt: str = None):
    """Create Razorpay order"""
    order_data = {
        "amount": int(amount * 100),  # Convert to paise
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1  # Auto capture
    }
    order = razorpay_client.order.create(data=order_data)
    return order

async def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature"""
    try:
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
```

---

## Swagger/OpenAPI Configuration

### Main Application Setup
```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Tour SaaS API",
    description="B2C Tour Booking Platform API with Razorpay Integration",
    version="1.0.0",
    docs_url="/api/docs",  # Swagger UI
    redoc_url="/api/redoc",  # ReDoc
    openapi_url="/api/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Development Phases (Backend Only)

### Phase 1: Project Setup (Week 1)
- [ ] Initialize FastAPI project with Poetry
- [ ] Set up PostgreSQL database
- [ ] Configure SQLAlchemy with async support
- [ ] Set up Alembic for migrations
- [ ] Create initial database schema
- [ ] Configure Redis
- [ ] Set up Docker and docker-compose

### Phase 2: Authentication (Week 2)
- [ ] Implement user model and schemas
- [ ] Create registration endpoint
- [ ] Create login endpoint with JWT
- [ ] Implement password hashing
- [ ] Create password reset flow
- [ ] Implement role-based access control

### Phase 3: Package Management (Weeks 3-4)
- [ ] Create package models and schemas
- [ ] Implement package CRUD endpoints
- [ ] Add image upload to S3/Cloudinary
- [ ] Create itinerary management
- [ ] Implement package search and filtering

### Phase 4: Booking Engine (Weeks 5-6)
- [ ] Create booking models and schemas
- [ ] Implement booking creation endpoint
- [ ] Add availability checking logic
- [ ] Create traveler information handling
- [ ] Implement booking cancellation logic

### Phase 5: Razorpay Integration (Week 7)
- [ ] Set up Razorpay account
- [ ] Install razorpay-python SDK
- [ ] Create payment models and schemas
- [ ] Implement order creation endpoint
- [ ] Add payment verification endpoint
- [ ] Set up webhook handler

### Phase 6: Email & Notifications (Week 8)
- [ ] Set up SendGrid/AWS SES
- [ ] Create email templates
- [ ] Implement booking confirmation email
- [ ] Add cancellation notification email

### Phase 7: Testing & Documentation (Week 9)
- [ ] Write unit tests for services
- [ ] Write integration tests for endpoints
- [ ] Add API documentation examples
- [ ] Test Razorpay integration

### Phase 8: Deployment (Week 10)
- [ ] Create production Dockerfile
- [ ] Deploy to production
- [ ] Configure domain and DNS
- [ ] Enable Swagger UI in production

---

## API Documentation Access

Once deployed, Swagger documentation will be available at:

- **Swagger UI**: `https://api.yourdomain.com/api/docs`
- **ReDoc**: `https://api.yourdomain.com/api/redoc`
- **OpenAPI JSON**: `https://api.yourdomain.com/api/openapi.json`
