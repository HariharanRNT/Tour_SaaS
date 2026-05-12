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
    HomepageSettingsUpdate, WebsitePagesConfigUpdate
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
        "homepage_settings": agent_profile.homepage_settings,
        "website_pages_config": agent_profile.website_pages_config
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
        "homepage_settings": agent_profile.homepage_settings,
        "website_pages_config": agent_profile.website_pages_config
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
        
        # Only update password if provided and not the mask
        if settings_in.password and settings_in.password != "********":
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
    
    # If password is empty or the mask in request, try to fetch from DB
    if not password_to_use or password_to_use == "********":
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Password empty or masked in test request for agent {agent_profile.id}. Attempting fallback to DB.")
        stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent_profile.id)
        result = await db.execute(stmt)
        saved_settings = result.scalar_one_or_none()
        
        if saved_settings and saved_settings.password:
             from app.utils.crypto import decrypt_value
             password_to_use = decrypt_value(saved_settings.password)
             source = "database (decrypted)"
             logger.info("Found saved password in DB and decrypted it.")
        else:
             logger.warning(f"No saved password found in DB for agent {agent_profile.id}.")
             raise HTTPException(status_code=400, detail="Password is required to test connection. Please enter it or save it first.")
    else:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Using password provided in test request for agent {agent_profile.id}.")

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
    
    target_email = settings_in.from_email
            
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
        
        # Only update secret if provided and not the mask
        if settings_in.key_secret and settings_in.key_secret != "********":
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


@router.put("/website-pages")
async def update_website_pages_config(
    settings_in: WebsitePagesConfigUpdate,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "edit"))
):
    """
    Update website pages (About, Contact) customization settings.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    current_config = agent_profile.website_pages_config or {}
    
    # Update provided sections
    update_data = settings_in.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        current_config[key] = value
            
    agent_profile.website_pages_config = current_config
    
    # Mark as modified
    flag_modified(agent_profile, "website_pages_config")
    
    db.add(agent_profile)
    await db.commit()
    await db.refresh(agent_profile)
    
    return {"message": "Website pages config updated", "config": agent_profile.website_pages_config}


@router.get("/public")
async def get_public_settings(
    domain: str = Depends(get_current_domain),
    db: AsyncSession = Depends(get_db)
):
    """
    Get public settings (brand name, homepage customizations) for the current domain.
    """
    from app.models import User
    
    # 1. Fetch Agent joined with User to check activation status
    stmt = select(Agent, User.is_active).join(User, Agent.user_id == User.id).where(Agent.domain == domain)
    result = await db.execute(stmt)
    row = result.first()
    
    agent = None
    is_active = True
    
    if row:
        agent, is_active = row
    else:
        # Fallback ONLY for localhost/development
        if settings.DEBUG or settings.APP_ENV == "development" or domain in ['localhost', '127.0.0.1', 'rnt.local']:
            # Pick an agent that actually has settings if possible, otherwise just any
            stmt = select(Agent, User.is_active).join(User, Agent.user_id == User.id).order_by(Agent.homepage_settings.isnot(None).desc()).limit(1)
            result = await db.execute(stmt)
            row = result.first()
            if row:
                agent, is_active = row
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for this domain")
        
    # 2. Block access if agent is deactivated
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This service is currently unavailable. Please contact support."
        )
        
    return {
        "agent_id": agent.user_id,
        "agency_name": agent.agency_name,
        "gst_applicable": agent.gst_applicable,
        "gst_percentage": float(agent.gst_percentage) if agent.gst_percentage is not None else 18.0,
        "gst_inclusive": agent.gst_inclusive,
        "homepage_settings": agent.homepage_settings or {},
        "website_pages_config": agent.website_pages_config or {}
    }


class EmailTestRequest(BaseModel):
    template_type: str
    structured_content: dict
    test_email: str

@router.post("/email/test")
@limiter.limit("100/hour")
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
    from app.utils.email_shells import EMAIL_SHELLS
    from app.utils.template_renderer import render_template
    from fastapi import HTTPException
    
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)

    template_type = test_in.template_type
    structured_content = test_in.structured_content
    test_email = test_in.test_email

    # 1. Build test data with sample values for all variables
    test_data = {
        # Identity
        "customer_name":      "Test Customer",
        "agency_name":        structured_content.get("agency_name") or agent_profile.agency_name or "Your Agency",
        "agent_email":        agent_user.email or "agent@example.com",
        "agent_phone":        getattr(agent_user, 'phone', None) or agent_profile.phone or "+91 00000 00000",

        # Booking
        "booking_reference":  "BK-TEST-12345",
        "reference_id":       "BK-TEST-12345",
        "package_name":       "Majestic Maldives Getaway",
        "travel_date":        "2026-06-15",
        "departure_date":     "2026-06-15",
        "travelers":          2,

        # Payment
        "total_amount":       "75,000.00",
        "amount_paid":        "75,000.00",
        "payment_method":     "Online Payment",
        "payment_date":       "2026-05-12",
        "invoice_number":     "INV-TEST-001",

        # Itinerary
        "itinerary_summary":  "5 Days / 4 Nights in Maldives",
        "destination":        "Maldives",
        "days_until_travel":  "30",

        # Cancellation / Refund
        "refund_amount":      "75,000.00",
        "refund_timeline":    "5-7 business days",

        # Agent contact
        "agent_name":         agent_user.first_name or "Your Agent",
        "agent_contact":      getattr(agent_user, 'phone', None) or agent_profile.phone or "Contact your agent",
        "support_email":      agent_user.email or "support@example.com",
    }

    # 2. Build structured content for the shell
    shell_content = {
        "hero_title":           structured_content.get("hero_title", ""),
        "hero_subtitle":        structured_content.get("hero_subtitle", ""),
        "intro_text":           structured_content.get("intro_text", ""),
        "details_title":        structured_content.get("details_title", "📌 Trip Details"),
        "footer_note":          structured_content.get("footer_note", "Warm regards,"),
        "footer_team":          structured_content.get("footer_team", f"The {test_data['agency_name']} Team"),
        "header_image_url":     structured_content.get("header_image_url", ""),
        "header_image_height":  structured_content.get("header_image_height", "40px"),
        "show_header":          structured_content.get("show_header", True),
        "show_body_image":      structured_content.get("show_body_image", False),
        # Invoice specific
        "invoice_title":        structured_content.get("invoice_title", "INVOICE"),
        "bill_to_label":        structured_content.get("bill_to_label", "Bill To:"),
        "total_label":          structured_content.get("total_label", "Total Amount:"),
        "invoice_note_title":   structured_content.get("invoice_note_title", "📄 Invoice Attached"),
        "invoice_note_text":    structured_content.get("invoice_note_text", ""),
        "important_note_title": structured_content.get("important_note_title", "🧾 Important Note"),
        "important_note_text":  structured_content.get("important_note_text", ""),
        "attachment_note":      structured_content.get("attachment_note", ""),
        "closing_text":         structured_content.get("closing_text", ""),
        "summary_label":        structured_content.get("summary_label", ""),
        "message_text":         structured_content.get("message_text", ""),
    }

    # 3. Generate HTML using EMAIL_SHELLS
    if template_type not in EMAIL_SHELLS:
        raise HTTPException(status_code=400, detail=f"Unknown template type: {template_type}")

    raw_html = EMAIL_SHELLS[template_type](shell_content)

    # 4. Replace all {{variables}} with test data
    html_body = render_template(raw_html, test_data, template_type=template_type)

    # 5. Send using agent SMTP if available, else system SMTP
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

    subject_map = {
        "booking_confirmation": "Test Email: Booking Confirmation",
        "travel_itinerary":     "Test Email: Travel Itinerary",
        "payment_receipt":      "Test Email: Payment Receipt",
        "booking_invoice":      "Test Email: Booking Invoice",
        "booking_cancellation": "Test Email: Booking Cancelled",
        "trip_reminder":        "Test Email: Trip Reminder",
    }
    subject = subject_map.get(template_type, "Test Email")

    success = await EmailService.send_email(
        to_email=test_email,
        subject=subject,
        body=html_body,
        smtp_config=smtp_config
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check SMTP configuration.")
        
    return {"message": f"Test email for {template_type} sent successfully to {test_email}."}

