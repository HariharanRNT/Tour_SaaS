from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional, Any
from pydantic import BaseModel

from app.database import get_db
from app.models import User, UserRole, Agent, AgentSMTPSettings, AgentRazorpaySettings
from app.schemas import (
    AgentSMTPSettingsCreate, AgentSMTPSettingsResponse,
    AgentRazorpaySettingsCreate, AgentRazorpaySettingsResponse,
    AgentSettingsResponse, AgentGeneralSettingsUpdate,
    HomepageSettingsUpdate
)
from app.api.deps import get_current_agent, get_current_domain, check_permission
from app.utils.crypto import encrypt_value
from app.services.email_service import EmailService
from app.main import limiter
from app.config import settings

router = APIRouter()

async def get_agent_profile_by_id(db: AsyncSession, agent_id: Any) -> Agent:
    """Helper to fetch agent profile by its owner's user_id."""
    stmt = select(Agent).where(Agent.user_id == agent_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    return profile

@router.get("", response_model=AgentSettingsResponse)
async def get_agent_settings(
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "view"))
):
    """
    Get all settings for the current agent.
    """
    # Use agent_id proxy from User model to get parent's ID
    agent_id = agent_user.agent_id
    
    # Get the agent details (profile)
    agent_profile = await get_agent_profile_by_id(db, agent_id)
    
    # SMTP
    stmt_smtp = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
    res_smtp = await db.execute(stmt_smtp)
    smtp_settings = res_smtp.scalar_one_or_none()
    
    # Razorpay
    stmt_rp = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent_profile.id)
    res_rp = await db.execute(stmt_rp)
    rp_settings = res_rp.scalar_one_or_none()
    
    return {
        "agency_name": agent_profile.agency_name,
        "currency": agent_profile.currency,
        "gst_applicable": agent_profile.gst_applicable,
        "gst_inclusive": agent_profile.gst_inclusive,
        "gst_percentage": agent_profile.gst_percentage,
        "smtp": smtp_settings,
        "razorpay": rp_settings,
        "homepage_settings": agent_profile.homepage_settings
    }

# --- General Settings Endpoints ---

@router.put("/general", response_model=AgentSettingsResponse)
async def update_general_settings(
    settings_in: AgentGeneralSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Update general settings (Currency, GST).
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    if settings_in.currency is not None:
        agent_profile.currency = settings_in.currency
    
    if settings_in.gst_applicable is not None:
        agent_profile.gst_applicable = settings_in.gst_applicable
    
    if settings_in.gst_inclusive is not None:
        agent_profile.gst_inclusive = settings_in.gst_inclusive
        
    if settings_in.gst_percentage is not None:
        agent_profile.gst_percentage = settings_in.gst_percentage
        
    await db.commit()
    await db.refresh(agent_profile)
    
    # Reload other settings for full response
    stmt_smtp = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
    res_smtp = await db.execute(stmt_smtp)
    smtp_settings = res_smtp.scalar_one_or_none()
    
    stmt_rp = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent_profile.id)
    res_rp = await db.execute(stmt_rp)
    rp_settings = res_rp.scalar_one_or_none()
    
    return {
        "agency_name": agent_profile.agency_name,
        "currency": agent_profile.currency,
        "gst_applicable": agent_profile.gst_applicable,
        "gst_inclusive": agent_profile.gst_inclusive,
        "gst_percentage": agent_profile.gst_percentage,
        "smtp": smtp_settings,
        "razorpay": rp_settings,
        "homepage_settings": agent_profile.homepage_settings
    }

# --- SMTP Endpoints ---

@router.put("/smtp", response_model=AgentSMTPSettingsResponse)
async def update_smtp_settings(
    settings_in: AgentSMTPSettingsCreate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Update or create SMTP settings.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    # Check if exists
    stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
    result = await db.execute(stmt)
    smtp_settings = result.scalar_one_or_none()
    
    if not smtp_settings:
        # Create
        if not settings_in.password:
            raise HTTPException(status_code=400, detail="Password is required for initial setup")
            
        smtp_settings = AgentSMTPSettings(
            agent_id=agent_profile.id,
            host=settings_in.host,
            port=settings_in.port,
            username=settings_in.username,
            password=encrypt_value(settings_in.password),
            from_email=settings_in.from_email,
            from_name=settings_in.from_name,
            encryption_type=settings_in.encryption_type
        )
        db.add(smtp_settings)
    else:
        # Update
        smtp_settings.host = settings_in.host
        smtp_settings.port = settings_in.port
        smtp_settings.username = settings_in.username
        smtp_settings.from_email = settings_in.from_email
        smtp_settings.from_name = settings_in.from_name
        smtp_settings.encryption_type = settings_in.encryption_type
        
        # Only update password if provided
        if settings_in.password:
            smtp_settings.password = encrypt_value(settings_in.password)
            
    await db.commit()
    await db.refresh(smtp_settings)
    
    return smtp_settings

@router.post("/smtp/test")
async def test_smtp_connection(
    settings_in: AgentSMTPSettingsCreate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Test SMTP configuration by sending a test email to the agent's email.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)
    
    # 1. Determine password to use
    password_to_use = settings_in.password
    source = "request"
    
    # If password is empty in request, try to fetch from DB
    if not password_to_use:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Password empty in test request for agent {agent_profile.id}. Attempting fallback to DB.")
        stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
        result = await db.execute(stmt)
        saved_settings = result.scalar_one_or_none()
        
        if saved_settings and saved_settings.password:
             from app.utils.crypto import decrypt_value
             password_to_use = decrypt_value(saved_settings.password)
             source = "database (decrypted)"
             logger.info("Found saved password in DB and decrypted it.")
        else:
             logger.warning(f"No saved password found in DB for agent {agent_id}.")
             raise HTTPException(status_code=400, detail="Password is required to test connection. Please enter it or save it first.")
    else:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Using password provided in test request for agent {agent_id}.")

    # Construct config dict
    smtp_config = {
        "host": settings_in.host,
        "port": settings_in.port,
        "user": settings_in.username,
        "password": password_to_use,
        "from_email": settings_in.from_email,
        "from_name": settings_in.from_name,
        "encryption_type": settings_in.encryption_type
    }
    
    logger.info(f"Testing SMTP with Host={settings_in.host}, Port={settings_in.port}, User={settings_in.username}, Encryption={settings_in.encryption_type}, PasswordSource={source}")
    
    # 2. Send Test Email
    subject = "SMTP Test Connection - Tour SaaS"
    body = f"""
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">SMTP Connection Successful</h2>
        <p>Hi {agent_user.first_name},</p>
        <p>Your SMTP configuration for <strong>{settings_in.from_name}</strong> is working correctly.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 5px 0;"><strong>Host:</strong> {settings_in.host}</p>
            <p style="margin: 5px 0;"><strong>Port:</strong> {settings_in.port}</p>
            <p style="margin: 5px 0;"><strong>User:</strong> {settings_in.username}</p>
            <p style="margin: 5px 0;"><strong>Encryption:</strong> {settings_in.encryption_type}</p>
        </div>
    </div>
    """
    
    target_email = agent_user.email
            
    if not target_email:
        raise HTTPException(status_code=400, detail="Could not determine where to send test email.")

    success = await EmailService.send_email(
        to_email=target_email,
        subject=subject,
        body=body,
        smtp_config=smtp_config
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to establish SMTP connection or send email. Check credentials and server logs.")
        
    return {"message": "Connection successful. Test email sent."}


# --- Razorpay Endpoints ---

@router.put("/razorpay", response_model=AgentRazorpaySettingsResponse)
async def update_razorpay_settings(
    settings_in: AgentRazorpaySettingsCreate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Update or create Razorpay settings.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    # Check if exists
    stmt = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent_profile.id)
    result = await db.execute(stmt)
    rp_settings = result.scalar_one_or_none()
    
    if not rp_settings:
        # Create
        if not settings_in.key_secret:
            raise HTTPException(status_code=400, detail="Key Secret is required for initial setup")
            
        rp_settings = AgentRazorpaySettings(
            agent_id=agent_profile.id,
            key_id=settings_in.key_id,
            key_secret=encrypt_value(settings_in.key_secret)
        )
        db.add(rp_settings)
    else:
        # Update
        rp_settings.key_id = settings_in.key_id
        
        # Only update secret if provided
        if settings_in.key_secret:
            rp_settings.key_secret = encrypt_value(settings_in.key_secret)
            
    await db.commit()
    await db.refresh(rp_settings)
    
    return rp_settings


# --- Homepage Settings Endpoints ---

@router.put("/homepage")
async def update_homepage_settings(
    settings_in: HomepageSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Update homepage customization settings.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    current_settings = agent_profile.homepage_settings or {}
    
    # Update only provided fields
    update_data = settings_in.model_dump(exclude_unset=True)
    
    print(f"DEBUG: Updating homepage settings for agent {agent_profile.id}")
    print(f"DEBUG: Payload: {update_data}")
    
    # Merge nested dictionaries if necessary, or just update top level
    for key, value in update_data.items():
        if isinstance(value, dict) and key in current_settings and isinstance(current_settings[key], dict):
            current_settings[key].update(value)
        else:
            current_settings[key] = value
            
    agent_profile.homepage_settings = current_settings
    
    # Update agency_name if provided
    if getattr(settings_in, 'agency_name', None) is not None:
        agent_profile.agency_name = settings_in.agency_name
    # EXPLICITLY mark as modified to ensure SQLAlchemy detects the change in the dict
    flag_modified(agent_profile, "homepage_settings")
    
    db.add(agent_profile)
    await db.commit()
    await db.refresh(agent_profile)
    
    print(f"DEBUG: Homepage settings updated in DB for agent {agent_profile.id}")
    
    return {"message": "Homepage settings updated", "settings": agent_profile.homepage_settings}


@router.get("/public")
async def get_public_settings(
    domain: str = Depends(get_current_domain),
    db: AsyncSession = Depends(get_db)
):
    """
    Get public settings (brand name, homepage customizations) for the current domain.
    """
    stmt = select(Agent).where(Agent.domain == domain)
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        # Fallback ONLY for localhost/development
        if settings.DEBUG or settings.APP_ENV == "development" or domain in ['localhost', '127.0.0.1', 'rnt.local']:
            # Pick an agent that actually has settings if possible, otherwise just any
            stmt = select(Agent).order_by(Agent.homepage_settings.isnot(None).desc()).limit(1)
            result = await db.execute(stmt)
            agent = result.scalar_one_or_none()
            
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for this domain")
        
    return {
        "agent_id": agent.user_id,
        "agency_name": agent.agency_name,
        "homepage_settings": agent.homepage_settings or {}
    }


class EmailTestRequest(BaseModel):
    template_type: str
    html_content: Any
    subject: Optional[str] = None

@router.post("/email/test")
@limiter.limit("5/hour")
async def send_test_email(
    request: Request,
    test_in: EmailTestRequest,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Send a test email using a custom HTML template.
    Rate limited to 5 per hour per agent.
    """
    from app.utils.template_renderer import render_template
    from datetime import datetime, date
    
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    # 1. Prepare Mock Data
    mock_data = {
        "customer_name": "Test Customer",
        "booking_reference": "BK-TEST-12345",
        "reference_id": "BK-TEST-12345", # fallback reference
        "package_name": "Majestic Maldives Getaway",
        "destination": "Maldives",
        "travel_date": str(date.today()),
        "departure_date": str(date.today()),
        "travelers": 2,
        "total_amount": 125000.00,
        "amount_paid": 125000.00,
        "payment_id": "pay_test_98765",
        "payment_date": str(date.today()),
        "payment_method": "Credit Card",
        "invoice_number": "INV-2024-001",
        "cancelled_date": str(date.today()),
        "refund_amount": 100000.00,
        "refund_timeline": "5-7 business days",
        "days_until_travel": 3,
        "itinerary_days": ["Day 1: Arrival", "Day 2: Beach Day", "Day 3: Departure"],
        "hotel_name": "Luxury Reef Resort",
        "pickup_time": "10:00 AM",
        "agency_name": agent_profile.agency_name or "TourSaaS",
        "agent_name": agent_profile.first_name,
        "agent_contact": agent_profile.phone or "N/A",
        "support_email": agent_user.email,
        "support_phone": agent_profile.phone or "N/A"
    }
    
    # 2. Render Template
    try:
        html_body = render_template(test_in.html_content, mock_data, template_type=test_in.template_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template rendering failed: {str(e)}")
        
    # 3. Determine Subject
    subject = test_in.subject or f"Test Email: {test_in.template_type.replace('_', ' ').title()}"
    
    # 4. Resolve SMTP
    # Try to use agent's own SMTP if configured
    smtp_config = None
    stmt_smtp = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
    res_smtp = await db.execute(stmt_smtp)
    saved_smtp = res_smtp.scalar_one_or_none()
    
    if saved_smtp:
        from app.utils.crypto import decrypt_value
        smtp_config = {
            "host": saved_smtp.host,
            "port": saved_smtp.port,
            "user": saved_smtp.username,
            "password": decrypt_value(saved_smtp.password),
            "from_email": saved_smtp.from_email,
            "from_name": saved_smtp.from_name,
            "encryption_type": saved_smtp.encryption_type
        }

    # 5. Send to agent's email
    target_email = agent_user.email
    if not target_email:
        raise HTTPException(status_code=400, detail="Agent email not found.")

    success = await EmailService.send_email(
        to_email=target_email,
        subject=subject,
        body=html_body,
        smtp_config=smtp_config
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check SMTP configuration.")
        
    return {"message": f"Test email for {test_in.template_type} sent successfully to {target_email}."}
