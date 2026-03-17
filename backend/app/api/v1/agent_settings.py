from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional

from app.database import get_db
from app.models import User, UserRole, Agent, AgentSMTPSettings, AgentRazorpaySettings
from app.schemas import (
    AgentSMTPSettingsCreate, AgentSMTPSettingsResponse,
    AgentRazorpaySettingsCreate, AgentRazorpaySettingsResponse,
    AgentSettingsResponse, AgentGeneralSettingsUpdate,
    HomepageSettingsUpdate
)
from app.api.deps import get_current_user, get_current_domain
from app.utils.crypto import encrypt_value
from app.services.email_service import EmailService

router = APIRouter()

async def get_current_agent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Agent:
    """Dependency to get the current user's agent profile."""
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Not an agent")
         
    # Ensure agent profile exists
    if not current_user.agent_profile:
        # Fallback query if relationship not loaded
        result = await db.execute(select(Agent).where(Agent.user_id == current_user.id))
        agent = result.scalar_one_or_none()
        if not agent:
             raise HTTPException(status_code=404, detail="Agent profile not found")
        return agent
    
    return current_user.agent_profile

@router.get("", response_model=AgentSettingsResponse)
async def get_agent_settings(
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all settings for the current agent.
    """
    # Eager load settings if not already (or rely on lazy load if async configured correctly, but manual query is safer)
    
    # SMTP
    stmt_smtp = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id)
    res_smtp = await db.execute(stmt_smtp)
    smtp_settings = res_smtp.scalar_one_or_none()
    
    # Razorpay
    stmt_rp = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent.id)
    res_rp = await db.execute(stmt_rp)
    rp_settings = res_rp.scalar_one_or_none()
    
    return {
        "currency": agent.currency,
        "gst_applicable": agent.gst_applicable,
        "gst_inclusive": agent.gst_inclusive,
        "gst_percentage": agent.gst_percentage,
        "smtp": smtp_settings,
        "razorpay": rp_settings,
        "homepage_settings": agent.homepage_settings
    }

# --- General Settings Endpoints ---

@router.put("/general", response_model=AgentSettingsResponse)
async def update_general_settings(
    settings_in: AgentGeneralSettingsUpdate,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Update general settings (Currency, GST).
    """
    if settings_in.currency is not None:
        agent.currency = settings_in.currency
    
    if settings_in.gst_applicable is not None:
        agent.gst_applicable = settings_in.gst_applicable
    
    if settings_in.gst_inclusive is not None:
        agent.gst_inclusive = settings_in.gst_inclusive
        
    if settings_in.gst_percentage is not None:
        agent.gst_percentage = settings_in.gst_percentage
        
    await db.commit()
    await db.refresh(agent)
    
    # Reload other settings for full response
    stmt_smtp = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id)
    res_smtp = await db.execute(stmt_smtp)
    smtp_settings = res_smtp.scalar_one_or_none()
    
    stmt_rp = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent.id)
    res_rp = await db.execute(stmt_rp)
    rp_settings = res_rp.scalar_one_or_none()
    
    return {
        "currency": agent.currency,
        "gst_applicable": agent.gst_applicable,
        "gst_inclusive": agent.gst_inclusive,
        "gst_percentage": agent.gst_percentage,
        "smtp": smtp_settings,
        "razorpay": rp_settings,
        "homepage_settings": agent.homepage_settings
    }

# --- SMTP Endpoints ---

@router.put("/smtp", response_model=AgentSMTPSettingsResponse)
async def update_smtp_settings(
    settings_in: AgentSMTPSettingsCreate,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Update or create SMTP settings.
    """
    # Check if exists
    stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id)
    result = await db.execute(stmt)
    smtp_settings = result.scalar_one_or_none()
    
    if not smtp_settings:
        # Create
        if not settings_in.password:
            raise HTTPException(status_code=400, detail="Password is required for initial setup")
            
        smtp_settings = AgentSMTPSettings(
            agent_id=agent.id,
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
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Test SMTP configuration by sending a test email to the agent's email.
    """
    # 1. Determine password to use
    password_to_use = settings_in.password
    source = "request"
    
    # If password is empty in request, try to fetch from DB
    if not password_to_use:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Password empty in test request for agent {agent.id}. Attempting fallback to DB.")
        stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id)
        result = await db.execute(stmt)
        saved_settings = result.scalar_one_or_none()
        
        if saved_settings and saved_settings.password:
             from app.utils.crypto import decrypt_value
             password_to_use = decrypt_value(saved_settings.password)
             source = "database (decrypted)"
             logger.info("Found saved password in DB and decrypted it.")
        else:
             logger.warning(f"No saved password found in DB for agent {agent.id}.")
             raise HTTPException(status_code=400, detail="Password is required to test connection. Please enter it or save it first.")
    else:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Using password provided in test request for agent {agent.id}.")

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
        <p>Hi {agent.first_name},</p>
        <p>Your SMTP configuration for <strong>{settings_in.from_name}</strong> is working correctly.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 5px 0;"><strong>Host:</strong> {settings_in.host}</p>
            <p style="margin: 5px 0;"><strong>Port:</strong> {settings_in.port}</p>
            <p style="margin: 5px 0;"><strong>User:</strong> {settings_in.username}</p>
            <p style="margin: 5px 0;"><strong>Encryption:</strong> {settings_in.encryption_type}</p>
        </div>
    </div>
    """
    
    # Need to load agent's user email if not available
    target_email = None
    if agent.user:
        target_email = agent.user.email
    else:
        # Fallback if relationship not loaded
        user_stmt = select(User).where(User.id == agent.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if user:
            target_email = user.email
            
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
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Update or create Razorpay settings.
    """
    # Check if exists
    stmt = select(AgentRazorpaySettings).where(AgentRazorpaySettings.agent_id == agent.id)
    result = await db.execute(stmt)
    rp_settings = result.scalar_one_or_none()
    
    if not rp_settings:
        # Create
        if not settings_in.key_secret:
            raise HTTPException(status_code=400, detail="Key Secret is required for initial setup")
            
        rp_settings = AgentRazorpaySettings(
            agent_id=agent.id,
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
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """
    Update homepage customization settings.
    """
    current_settings = agent.homepage_settings or {}
    
    # Update only provided fields
    update_data = settings_in.model_dump(exclude_unset=True)
    
    print(f"DEBUG: Updating homepage settings for agent {agent.id}")
    print(f"DEBUG: Payload: {update_data}")
    
    # Merge nested dictionaries if necessary, or just update top level
    for key, value in update_data.items():
        if isinstance(value, dict) and key in current_settings and isinstance(current_settings[key], dict):
            current_settings[key].update(value)
        else:
            current_settings[key] = value
            
    agent.homepage_settings = current_settings
    # EXPLICITLY mark as modified to ensure SQLAlchemy detects the change in the dict
    flag_modified(agent, "homepage_settings")
    
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    print(f"DEBUG: Homepage settings updated in DB for agent {agent.id}")
    
    return {"message": "Homepage settings updated", "settings": agent.homepage_settings}


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
        if domain in ['localhost', '127.0.0.1']:
            # Pick an agent that actually has settings if possible, otherwise just any
            stmt = select(Agent).order_by(Agent.homepage_settings.isnot(None).desc()).limit(1)
            result = await db.execute(stmt)
            agent = result.scalar_one_or_none()
            
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for this domain")
        
    return {
        "agency_name": agent.agency_name,
        "homepage_settings": agent.homepage_settings or {}
    }
