# Tour SaaS Backend API

B2C Tour Booking Platform API built with FastAPI and Razorpay integration.

## Features

- ✅ User Authentication (JWT)
- ✅ Package Management (CRUD)
- ✅ Booking Engine
- ✅ Razorpay Payment Integration
- ✅ Swagger/OpenAPI Documentation
- ✅ PostgreSQL Database
- ✅ Async SQLAlchemy ORM

## Tech Stack

- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (async)
- **Authentication**: JWT
- **Payment**: Razorpay
- **Documentation**: Swagger UI

## Setup Instructions

### 1. Install Dependencies

```bash
# Using pip
pip install -r requirements.txt

# Or using poetry
poetry install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: Generate a secure secret key
- `JWT_SECRET_KEY`: Generate a secure JWT secret
- `RAZORPAY_KEY_ID`: Your Razorpay key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay secret key

### 3. Set Up Database

```bash
# Create database
createdb tour_saas

# Run migrations
alembic upgrade head
```

### 4. Run the Application

```bash
# Development mode
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, access the documentation at:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Packages
- `GET /api/v1/packages` - List packages (with filters)
- `GET /api/v1/packages/{id}` - Get package details
- `POST /api/v1/packages` - Create package (Admin)
- `PUT /api/v1/packages/{id}` - Update package (Admin)
- `DELETE /api/v1/packages/{id}` - Delete package (Admin)

### Bookings
- `GET /api/v1/bookings` - List user bookings
- `GET /api/v1/bookings/{id}` - Get booking details
- `POST /api/v1/bookings` - Create booking
- `PUT /api/v1/bookings/{id}/cancel` - Cancel booking

### Payments
- `POST /api/v1/payments/create-order` - Create Razorpay order
- `POST /api/v1/payments/verify` - Verify payment
- `GET /api/v1/payments/{id}` - Get payment details

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Testing

```bash
pytest
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── packages.py
│   │       ├── bookings.py
│   │       └── payments.py
│   ├── core/
│   │   ├── security.py
│   │   └── exceptions.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── main.py
├── alembic/
├── requirements.txt
├── .env
└── README.md
```

## License

MIT
