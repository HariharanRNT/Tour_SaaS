"""Main FastAPI application"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)

from app.config import settings
from app.api.v1 import (
    auth, packages, bookings, payments, tours, flights, templates, 
    user_itineraries, packages_enhanced, bookings_custom, admin_packages, 
    admin_simple, trip_planner, agent_packages, admin_agents, 
    admin_notifications, agent_notifications, agent_bookings, agent_customers, 
    agent_dashboard, subscriptions, agent_settings, ai_assistant, upload, 
    reports, webhooks, activities, agent_reports, agent_subusers
)
import traceback
import logging
import sys

# Configure root logger to guarantee output to terminal for all warnings and above
logging.basicConfig(
    level=logging.WARNING,
    format="%(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="B2C Tour Booking Platform API with Razorpay Integration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}")
    logger.error(f"Request: {request.method} {request.url}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )
    
    # Add CORS headers manually for error responses if Origin is present
    origin = request.headers.get("origin")
    if origin:
        # In production, you'd check if origin is allowed. In dev, we can be flexible.
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
    return response

# CORS middleware - MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    # Allow localhost and any .local domain on port 3000 and 3001
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://agent.local:3000",
        "http://rnt.local:3000",
        "http://rnt.local"
    ],
    allow_origin_regex="http://.*\.local(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
from fastapi.staticfiles import StaticFiles
import os
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Limiter already initialized above

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(bookings.router, prefix=f"{settings.API_V1_PREFIX}/bookings", tags=["Bookings"])
app.include_router(payments.router, prefix=f"{settings.API_V1_PREFIX}/payments", tags=["Payments"])
app.include_router(tours.router, prefix=f"{settings.API_V1_PREFIX}/tours", tags=["Tours & Activities"])
app.include_router(flights.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Flights"])
app.include_router(templates.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Admin - Templates"])
app.include_router(user_itineraries.router, prefix=f"{settings.API_V1_PREFIX}", tags=["User Itineraries"])
app.include_router(packages.router, prefix=f"{settings.API_V1_PREFIX}/packages", tags=["Packages"])
app.include_router(packages_enhanced.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Packages - Enhanced"])
app.include_router(bookings_custom.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Bookings - Custom"])
app.include_router(agent_bookings.router, prefix=f"{settings.API_V1_PREFIX}/agent", tags=["Agent - Bookings"])
app.include_router(agent_customers.router, prefix=f"{settings.API_V1_PREFIX}/agent/customers", tags=["Agent - Customers"])
app.include_router(agent_packages.router, prefix=f"{settings.API_V1_PREFIX}/agent", tags=["Agent - Packages"])
app.include_router(admin_agents.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin - Agents"])
app.include_router(admin_notifications.router, prefix=f"{settings.API_V1_PREFIX}/admin/notifications", tags=["Admin - Notifications"])
app.include_router(admin_packages.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin - Packages"])
app.include_router(admin_simple.router, prefix=f"{settings.API_V1_PREFIX}/admin-simple", tags=["Admin - Simple"])
app.include_router(agent_dashboard.router, prefix=f"{settings.API_V1_PREFIX}/agent-dashboard", tags=["Agent - Dashboard"])
app.include_router(trip_planner.router, prefix=f"{settings.API_V1_PREFIX}/trip-planner", tags=["Trip Planner"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["Subscriptions"])
app.include_router(agent_notifications.router, prefix=f"{settings.API_V1_PREFIX}/agent/notifications", tags=["Agent - Notifications"])
app.include_router(agent_settings.router, prefix=f"{settings.API_V1_PREFIX}/agent/settings", tags=["Agent - Settings"])
app.include_router(ai_assistant.router, prefix=f"{settings.API_V1_PREFIX}", tags=["AI Assistant"])
app.include_router(upload.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Uploads"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["Reports"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_PREFIX}/webhooks", tags=["Webhooks"])
# app.include_router(theme.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Agent - Theme"])
app.include_router(activities.router, prefix=f"{settings.API_V1_PREFIX}/activities", tags=["Activities"])
app.include_router(agent_reports.router, prefix=f"{settings.API_V1_PREFIX}/agent/reports", tags=["Agent - Reports"])
app.include_router(agent_subusers.router, prefix=f"{settings.API_V1_PREFIX}/agent/sub-users", tags=["Agent - Sub-Users"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Tour SaaS API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "tour-saas-api"}
