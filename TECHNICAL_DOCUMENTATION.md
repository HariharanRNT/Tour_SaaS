# Project Technical Documentation

## 1. Programming Languages

### Frontend
- **TypeScript**: Primary language for robust, type-safe development (v5.3).
- **JavaScript (ES6+)**: Used continuously within the TypeScript environment.
- **HTML5 / CSS3**: Implemented via JSX and Utility-first CSS.

### Backend
- **Python (3.10+)**: Core server-side language chosen for rigorous async support and data processing capabilities.

---

## 2. Frontend Technology Stack

| Category | Technology | Description |
|----------|------------|-------------|
| **Framework** | **Next.js 14** | App Router architecture, Server & Client Components. |
| **Language** | **TypeScript** | Static typing for reliability. |
| **Styling** | **Tailwind CSS** | Utility-first CSS framework. |
| **UI Components** | **Radix UI** | Headless primitives for accessible components (Dialog, Popover, etc.). |
| **State Management** | **Zustand** | Lightweight global state management (e.g., auth, cart state). |
| **Forms** | **React Hook Form** | Performant form validation. |
| **Validation** | **Zod** | Schema validation for forms and API responses. |
| **Data Fetching** | **TanStack Query** | Server state management, caching, and synchronization. |
| **HTTP Client** | **Axios** | Promise-based HTTP client for API requests. |
| **Icons** | **Lucide React** | Consistent, lightweight icon library. |
| **Charts** | **Recharts** | Composable charting library for dashboard analytics. |

---

## 3. Backend Technology Stack

| Category | Technology | Description |
|----------|------------|-------------|
| **Framework** | **FastAPI** | High-performance, async web framework. |
| **ORM** | **SQLAlchemy 2.0** | Modern, async Object-Relational Mapper. |
| **Database Driver** | **AsyncPG** | High-performance async PostgreSQL driver. |
| **Migrations** | **Alembic** | Database schema migrations and version control. |
| **Schema Validation** | **Pydantic v2** | Data parsing and validation using Python type hints. |
| **Authentication** | **Python-Jose** | JWT encoding/decoding. |
| **Password Hashing** | **Passlib (Bcrypt)** | Secure password hashing. |
| **Payment SDK** | **Razorpay** | Payment gateway integration. |

---

## 4. Frontend ↔ Backend Communication

- **Protocol**: HTTP / HTTPS.
- **Architecture**: REST API.
- **Data Format**: JSON (application/json).
- **Client**: `Axios` is configured with interceptors to automatically attach authentication tokens.
- **Authentication**:
  - **Mechanism**: JWT (JSON Web Tokens).
  - **Flow**: User logs in -> Backend issues valid `access_token` -> Frontend stores in `localStorage` -> Frontend attaches `Authorization: Bearer <token>` header to subsequent requests.

---

## 5. Database Design & Model Development

- **Database**: **PostgreSQL** (Production/Dev), SQLite (Legacy/Testing).
- **Design Approach**: Relational Schema (Normalized).
- **ORM**: Models are defined as Python classes using **SQLAlchemy Declarative Base**.
- **Relationships**: handled via SQLAlchemy `relationship()` (One-to-Many, Many-to-Many).
- **Migrations**: **Alembic** is used to auto-generate migration scripts based on changes detected in the SQLAlchemy models.

### Key Models
- `User`: Handles authentication and roles (Admin, Agent, Customer).
- `Package`: Tour packages with pricing, itinerary, and availability.
- `Booking`: Tracks customer bookings and payment status.
- `Itinerary`: Day-wise activities linked to packages.

---

## 6. Payment Integration

- **Gateway**: **Razorpay**.
- **Flow**:
  1. Frontend initiates order -> calls Backend.
  2. Backend creates Razorpay Order -> returns `order_id`.
  3. Frontend opens Razorpay Checkout.
  4. On success, Frontend sends `payment_id` and `signature` to Backend for verification.
  5. **Verification**: Backend verifies the payment signature using the Razorpay SDK to prevent tampering.

---

## 7. Email & Notification System

- **Approach**: SMTP (Simple Mail Transfer Protocol).
- **Library**: Standard Python `email` / `smtplib` or asynchronous alternatives compatible with FastAPI.
- **Notifications**: In-app notifications modeled in the database (`Notification` table) and served via API to the frontend.

---

## 8. Deployment & Environment

- **Environment Config**: `.env` files managed by `pydantic-settings`.
- **Development**:
  - Frontend: `npm run dev` (Next.js Dev Server).
  - Backend: `uvicorn app.main:app --reload`.
- **Production**:
  - Frontend: `npm run build` -> `npm start` (Node.js) or Static Export + CDN.
  - Backend: Gunicorn + Uvicorn workers behind a reserve proxy (Nginx).
  - Database: Managed PostgreSQL instance (e.g., AWS RDS, Supabase).

---

## 9. Security Practices

- **Authentication**: JWT-based stateless auth.
- **Password Security**: Bcrypt hashing (never store plain text).
- **Authorization**: Role-based dependencies in FastAPI (`get_current_active_user`, `get_admin_user`).
- **Validation**: Strict Pydantic schemas prevent over-posting and ensure data integrity.
- **CORS**: Configured to specific frontend origins to prevent unauthorized cross-origin requests.

---

## 10. Architecture Summary

### High-Level Flow
1. **User Interaction**: User interacts with Next.js UI.
2. **Request**: Axios sends async HTTP request to FastAPI Backend.
3. **Gateway/Auth**: FastAPI Middleware/Dependency validates JWT token.
4. **Logic**: Controller calls Service layer for business logic.
5. **Data Access**: Service uses SQLAlchemy to query PostgreSQL.
6. **Response**: Data is serialized to Pydantic models -> JSON -> Frontend.

### Request Lifecycle
`Client -> Nginx (Reverse Proxy) -> Uvicorn (ASGI) -> FastAPI Router -> Dependency Injection (Auth/DB) -> Path Operation -> Service Layer -> Database -> Response`
