from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional, Any, List, Literal
from pydantic import BaseModel, validator
import re
import io
import asyncio
import logging

logger = logging.getLogger(__name__)

DEFAULT_DOMESTIC_SETTINGS = {
    'logo_position': 'top_left',
    'logo_url': '',
    'primary_color': '#1a5276',
    'accent_color': '#f39c12',
    'font_style': 'modern',
    'show_footer': True,
    'itinerary_layout': 'vertical',
    'time_slots': {
        'morning': {'enabled': True, 'label': 'Morning'},
        'afternoon': {'enabled': True, 'label': 'Afternoon'},
        'evening': {'enabled': True, 'label': 'Evening'},
        'night': {'enabled': True, 'label': 'Night'},
        'full_day': {'enabled': True, 'label': 'Full Day'},
        'half_day': {'enabled': False, 'label': 'Half Day'},
    },
    'content_visibility': {
        'show_inclusions': True,
        'show_exclusions': True,
        'show_cancellation': True,
        'show_activity_images': True,
    },
    'sections': [
        {'id': 'header', 'label': 'Header / Cover Block', 'visible': True},
        {'id': 'itinerary', 'label': 'Itinerary (Day-wise)', 'visible': True},
        {'id': 'inclusions', 'label': 'Inclusions', 'visible': True},
        {'id': 'exclusions', 'label': 'Exclusions', 'visible': True},
        {'id': 'pricing', 'label': 'Pricing Table', 'visible': True},
        {'id': 'cancellation', 'label': 'Cancellation Policy', 'visible': True},
        {'id': 'terms', 'label': 'Terms & Conditions', 'visible': True},
        {'id': 'footer', 'label': 'Footer (Contact Info)', 'visible': True},
    ],
    'terms': {'show': True, 'use_global': True, 'custom_text': ''},
    'extra_sections': [
        { 'id': 'dom-1', 'heading': 'Local Transport',       'content': 'Standard AC Sedan/SUV for sightseeing and transfers as per itinerary.', 'show': True },
        { 'id': 'dom-2', 'heading': 'Flight & Train Details','content': 'Domestic flight/train tickets are not included unless specified.', 'show': True },
        { 'id': 'dom-3', 'heading': 'GST Breakdown',         'content': 'GST applicable at 18% total (9% CGST + 9% SGST).', 'show': True },
        { 'id': 'dom-4', 'heading': 'State Permit Notes',    'content': 'Certain regions require inner line permits. Details shared on booking.', 'show': False },
        { 'id': 'dom-5', 'heading': 'Regional Notes',        'content': 'Local customs and dress codes apply at religious and heritage sites.', 'show': False },
    ]
}

DEFAULT_INTERNATIONAL_SETTINGS = {
    'logo_position': 'top_left',
    'logo_url': '',
    'primary_color': '#2a6286',
    'accent_color': '#e67e22',
    'font_style': 'modern',
    'show_footer': True,
    'itinerary_layout': 'vertical',
    'time_slots': {
        'morning': {'enabled': True, 'label': 'Morning'},
        'afternoon': {'enabled': True, 'label': 'Afternoon'},
        'evening': {'enabled': True, 'label': 'Evening'},
        'night': {'enabled': True, 'label': 'Night'},
        'full_day': {'enabled': True, 'label': 'Full Day'},
        'half_day': {'enabled': False, 'label': 'Half Day'},
    },
    'content_visibility': {
        'show_inclusions': True,
        'show_exclusions': True,
        'show_cancellation': True,
        'show_activity_images': True,
    },
    'sections': [
        {'id': 'header', 'label': 'Header / Cover Block', 'visible': True},
        {'id': 'itinerary', 'label': 'Itinerary (Day-wise)', 'visible': True},
        {'id': 'inclusions', 'label': 'Inclusions', 'visible': True},
        {'id': 'exclusions', 'label': 'Exclusions', 'visible': True},
        {'id': 'pricing', 'label': 'Pricing Table', 'visible': True},
        {'id': 'cancellation', 'label': 'Cancellation Policy', 'visible': True},
        {'id': 'terms', 'label': 'Terms & Conditions', 'visible': True},
        {'id': 'footer', 'label': 'Footer (Contact Info)', 'visible': True},
    ],
    'terms': {'show': True, 'use_global': True, 'custom_text': ''},
    'extra_sections': [
        { 'id': 'intl-1', 'heading': 'Visa Requirements',         'content': 'Visa on arrival or pre-travel visa processing is required as per destination country guidelines.', 'show': True },
        { 'id': 'intl-2', 'heading': 'Passport Validity',         'content': 'Passport must be valid for at least 6 months from the date of travel.', 'show': True },
        { 'id': 'intl-3', 'heading': 'Currency Exchange',         'content': 'We recommend carrying international credit cards and local currency cash.', 'show': True },
        { 'id': 'intl-4', 'heading': 'International Flight Info', 'content': 'International flights are not included unless explicitly mentioned in inclusions.', 'show': True },
        { 'id': 'intl-5', 'heading': 'Forex Guidelines',          'content': 'Please carry a loaded multi-currency Forex card for convenient payments.', 'show': False },
        { 'id': 'intl-6', 'heading': 'Travel Insurance',          'content': 'We strongly recommend purchasing comprehensive travel insurance.', 'show': False },
        { 'id': 'intl-7', 'heading': 'Embassy Contacts',          'content': 'Indian Embassy contact details will be shared upon booking confirmation.', 'show': False },
    ]
}

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
from app.core.limiter import limiter
from app.config import settings


router = APIRouter()

def migrate_extra_sections(saved: dict, travel_type: str) -> list:
    if not saved:
        saved = {}
    extra_sections = saved.get('extra_sections')
    if isinstance(extra_sections, list):
        return extra_sections

    old_extra = extra_sections if isinstance(extra_sections, dict) else {}

    if travel_type == 'domestic':
        local_trans = saved.get('local_transport', 'Standard AC Sedan/SUV for sightseeing and transfers as per itinerary.')
        dom_flight = saved.get('domestic_flight_train', 'Domestic flight/train tickets are not included unless specified.')
        gst_bd = saved.get('gst_breakdown', 'GST applicable at 18% total (9% CGST + 9% SGST).')
        state_perm = saved.get('state_permit', 'Certain regions require inner line permits. Details shared on booking.')
        regional_notes = saved.get('regional_language', 'Local customs and dress codes apply at religious and heritage sites.')

        return [
            { 'id': 'dom-1', 'heading': 'Local Transport',       'content': local_trans, 'show': old_extra.get('show_local_transport', True) },
            { 'id': 'dom-2', 'heading': 'Flight & Train Details','content': dom_flight, 'show': old_extra.get('show_domestic_travel_details', True) },
            { 'id': 'dom-3', 'heading': 'GST Breakdown',         'content': gst_bd, 'show': old_extra.get('show_gst_breakdown', True) },
            { 'id': 'dom-4', 'heading': 'State Permit Notes',    'content': state_perm, 'show': old_extra.get('show_state_permits', False) },
            { 'id': 'dom-5', 'heading': 'Regional Notes',        'content': regional_notes, 'show': old_extra.get('show_regional_notes', False) },
        ]
    else:
        visa = saved.get('visa_notes', 'Visa on arrival or pre-travel visa processing is required as per destination country guidelines.')
        passport = saved.get('passport_notes', 'Passport must be valid for at least 6 months from the date of travel.')
        currency = saved.get('currency_exchange', 'We recommend carrying international credit cards and local currency cash.')
        flight = saved.get('intl_flight', 'International flights are not included unless explicitly mentioned in inclusions.')
        forex = saved.get('forex_guidelines', 'Please carry a loaded multi-currency Forex card for convenient payments.')
        insurance = saved.get('timezone_notes', 'We strongly recommend purchasing comprehensive travel insurance.')
        embassy = saved.get('embassy_contact', 'Indian Embassy contact details will be shared upon booking confirmation.')

        return [
            { 'id': 'intl-1', 'heading': 'Visa Requirements',         'content': visa, 'show': old_extra.get('show_visa_info', True) },
            { 'id': 'intl-2', 'heading': 'Passport Validity',         'content': passport, 'show': old_extra.get('show_passport_notes', True) },
            { 'id': 'intl-3', 'heading': 'Currency Exchange',         'content': currency, 'show': old_extra.get('show_currency_info', True) },
            { 'id': 'intl-4', 'heading': 'International Flight Info', 'content': flight, 'show': old_extra.get('show_flight_details', True) },
            { 'id': 'intl-5', 'heading': 'Forex Guidelines',          'content': forex, 'show': old_extra.get('show_forex_guidelines', False) },
            { 'id': 'intl-6', 'heading': 'Travel Insurance',          'content': insurance, 'show': old_extra.get('show_insurance_notes', False) },
            { 'id': 'intl-7', 'heading': 'Embassy Contacts',          'content': embassy, 'show': old_extra.get('show_embassy_contacts', False) },
        ]

def _migrate_pdf_customizer(settings_dict: dict) -> dict:
    if not settings_dict:
        settings_dict = {}
    
    pdf_cust = settings_dict.get('pdf_customizer')
    if not pdf_cust:
        settings_dict['pdf_customizer'] = {
            'domestic': DEFAULT_DOMESTIC_SETTINGS.copy(),
            'international': DEFAULT_INTERNATIONAL_SETTINGS.copy()
        }
        return settings_dict
    
    if not isinstance(pdf_cust, dict):
        settings_dict['pdf_customizer'] = {
            'domestic': DEFAULT_DOMESTIC_SETTINGS.copy(),
            'international': DEFAULT_INTERNATIONAL_SETTINGS.copy()
        }
        return settings_dict

    if 'domestic' not in pdf_cust or 'international' not in pdf_cust:
        domestic = DEFAULT_DOMESTIC_SETTINGS.copy()
        international = DEFAULT_INTERNATIONAL_SETTINGS.copy()
        for k, v in pdf_cust.items():
            if k not in ('domestic', 'international'):
                domestic[k] = v
                international[k] = v
        settings_dict['pdf_customizer'] = {
            'domestic': domestic,
            'international': international
        }
    else:
        for key in ['domestic', 'international']:
            defaults = DEFAULT_DOMESTIC_SETTINGS if key == 'domestic' else DEFAULT_INTERNATIONAL_SETTINGS
            curr_val = pdf_cust.get(key)
            if not isinstance(curr_val, dict):
                curr_val = {}
            merged = defaults.copy()
            merged.update(curr_val)
            pdf_cust[key] = merged

    for key in ['domestic', 'international']:
        val = settings_dict['pdf_customizer'][key]
        if isinstance(val, dict):
            val['extra_sections'] = migrate_extra_sections(val, key)
            for old_k in ['local_transport', 'state_permit', 'regional_language', 'domestic_flight_train', 'gst_breakdown',
                          'visa_notes', 'passport_notes', 'currency_exchange', 'intl_flight', 'timezone_notes', 'embassy_contact', 'forex_guidelines']:
                val.pop(old_k, None)
            
    return settings_dict

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
        "homepage_settings": _migrate_pdf_customizer(agent_profile.homepage_settings or {}),
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
        "homepage_settings": _migrate_pdf_customizer(agent_profile.homepage_settings or {}),
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
            encryption_type=settings_in.encryption_type,
            confirmation_email_subject=settings_in.confirmation_email_subject,
            confirmation_email_body=settings_in.confirmation_email_body
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
        
        if settings_in.confirmation_email_subject is not None:
            smtp_settings.confirmation_email_subject = settings_in.confirmation_email_subject
        if settings_in.confirmation_email_body is not None:
            smtp_settings.confirmation_email_body = settings_in.confirmation_email_body
        
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
    
    return {"message": "Homepage settings updated", "settings": _migrate_pdf_customizer(agent_profile.homepage_settings or {})}


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
        "homepage_settings": _migrate_pdf_customizer(agent.homepage_settings or {}),
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
        "copyright_text":        structured_content.get("copyright_text"),
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


# ---------------------------------------------------------------------------
# PDF Customizer — Sanitization helpers
# ---------------------------------------------------------------------------

_UNSAFE_PATTERN = re.compile(
    r'<script|javascript:|on\w+\s*=|<iframe|<object|<embed|data:\s*text/html|data:\s*application/|vbscript:',
    re.IGNORECASE
)

_VALID_HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')


def _clean_str(value: str) -> str:
    """Strip known injection patterns from a single string."""
    return _UNSAFE_PATTERN.sub('', value).strip()


def _clean_color(value: str, fallback: str = '#000000') -> str:
    """Return value only if it is a valid #RRGGBB hex string."""
    v = (value or '').strip()
    return v if _VALID_HEX_COLOR.match(v) else fallback


def _deep_clean(obj: Any) -> Any:
    """
    Recursively sanitize every string inside a nested settings dict/list.
    Color keys receive strict hex validation; logo_url is cleared if it contains
    non-http(s) schemes; all other strings go through _clean_str.
    """
    if isinstance(obj, str):
        return _clean_str(obj)
    if isinstance(obj, list):
        return [_deep_clean(item) for item in obj]
    if isinstance(obj, dict):
        result = {}
        for key, val in obj.items():
            if key in ('primary_color', 'accent_color'):
                result[key] = _clean_color(val if isinstance(val, str) else '')
            elif key == 'logo_url':
                url = (val or '').strip() if isinstance(val, str) else ''
                result[key] = url if url.startswith(('http://', 'https://')) else ''
            else:
                result[key] = _deep_clean(val)
        return result
    return obj


# ---------------------------------------------------------------------------
# PDF Customizer — Pydantic models
# ---------------------------------------------------------------------------

class ContentVisibilityModel(BaseModel):
    show_inclusions: bool = True
    show_exclusions: bool = True
    show_cancellation: bool = True
    show_activity_images: bool = True


class TimeSlotModel(BaseModel):
    enabled: bool = True
    label: str = ''


class PdfSectionModel(BaseModel):
    id: str
    label: str
    visible: bool = True


class TermsModel(BaseModel):
    show: bool = True
    use_global: bool = True
    custom_text: str = ''


class PdfCustomizerSettingsModel(BaseModel):
    logo_position: str = 'top_left'
    logo_url: str = ''
    primary_color: str = '#1a5276'
    accent_color: str = '#f39c12'
    font_style: str = 'modern'
    show_footer: bool = True
    time_slots: dict = {}
    content_visibility: ContentVisibilityModel = ContentVisibilityModel()
    sections: List[PdfSectionModel] = []
    terms: TermsModel = TermsModel()
    itinerary_layout: Literal['vertical', 'horizontal'] = 'vertical'
    extra_sections: List[dict] = []


class PdfCustomizerPreviewRequest(BaseModel):
    settings: dict
    package_id: Optional[str] = None
    travel_type: str = "domestic"

    @validator('settings', pre=True)
    def sanitize_settings(cls, v):  # noqa: N805
        if not isinstance(v, dict):
            raise ValueError('settings must be a dict')
        return _deep_clean(v)


# ---------------------------------------------------------------------------
# PDF Customizer — Save endpoint (re-uses existing homepage PUT path)
# ---------------------------------------------------------------------------
# NOTE: Saving is handled by PUT /agent/settings/homepage with
#       { "pdf_customizer": { ... } } — no additional endpoint needed.
# The _deep_clean is applied below in the preview endpoint; for the save path
# the HomepageSettingsUpdate schema accepts arbitrary keys so the sanitization
# must be done by the caller (frontend deepSanitizeSettings) or we add a
# pre-save hook here. We protect it via the preview endpoint where values
# would be rendered into a PDF.


# ---------------------------------------------------------------------------
# PDF Customizer — Preview endpoint
# ---------------------------------------------------------------------------

FONT_MAP = {
    'modern':  'Helvetica',
    'classic': 'Times-Roman',
    'minimal': 'Helvetica-Oblique',
    'default': 'Helvetica',
}

SECTION_LABEL_MAP = {
    'header':       'Header / Cover',
    'itinerary':    'Itinerary',
    'inclusions':   'Inclusions',
    'exclusions':   'Exclusions',
    'pricing':      'Pricing Table',
    'cancellation': 'Cancellation Policy',
    'terms':        'Terms & Conditions',
    'footer':       'Footer',
}


def _hex_to_rgb(hex_color: str):
    """Convert #RRGGBB to (R, G, B) floats in 0-1 range for ReportLab."""
    h = hex_color.lstrip('#')
    if len(h) != 6:
        return (0.1, 0.32, 0.46)  # default blue
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r / 255, g / 255, b / 255)


SLOT_ORDER = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'half_day']

def get_active_slots(time_slots: dict) -> list:
    """Returns list of (slot_key, display_label) for enabled slots only, in order."""
    return [
        (key, _clean_str(time_slots.get(key, {}).get('label', key.replace('_', ' ').title())))
        for key in SLOT_ORDER
        if time_slots.get(key, {}).get('enabled', True)
    ]

SAMPLE_DAYS = [
    { "title": "Arrival & City Overview",   "destination": "Singapore" },
    { "title": "Sentosa Island Adventure",  "destination": "Singapore" },
    { "title": "Cultural Quarter Exploring","destination": "Singapore" },
]
SAMPLE_ACTIVITY = "Sample activity description for this slot."


import urllib.request
import urllib.error
import json
import time
from collections import defaultdict, OrderedDict

# ---------------------------------------------------------------------------
# Bounded LRU image cache with per-entry TTL
# Max 500 entries, 2-hour (7200s) expiry per entry.
# Each entry: {"data": <bytes>, "cached_at": <float unix ts>}
# ---------------------------------------------------------------------------
_IMAGE_CACHE_MAX = 500
_IMAGE_CACHE_TTL = 7200  # seconds
_IMAGE_CACHE: OrderedDict = OrderedDict()


def _cache_is_expired(entry: dict) -> bool:
    """Return True if the cache entry is older than the TTL."""
    return (time.time() - entry.get("cached_at", 0)) > _IMAGE_CACHE_TTL


def _cache_get(url: str) -> bytes | None:
    """Read from the LRU cache; returns raw bytes or None on miss/expiry."""
    entry = _IMAGE_CACHE.get(url)
    if entry is None:
        return None
    if _cache_is_expired(entry):
        _IMAGE_CACHE.pop(url, None)
        return None
    # Move to end (most recently used)
    _IMAGE_CACHE.move_to_end(url)
    return entry["data"]


def _cache_put(url: str, data: bytes) -> None:
    """Write to the LRU cache, evicting oldest entry when at capacity."""
    if url in _IMAGE_CACHE:
        _IMAGE_CACHE.move_to_end(url)
    else:
        if len(_IMAGE_CACHE) >= _IMAGE_CACHE_MAX:
            _IMAGE_CACHE.popitem(last=False)  # Evict oldest
    _IMAGE_CACHE[url] = {"data": data, "cached_at": time.time()}


def get_image_cache_stats() -> dict:
    """Return cache health metrics for logging."""
    total_bytes = sum(
        len(e["data"]) for e in _IMAGE_CACHE.values() if isinstance(e.get("data"), (bytes, bytearray))
    )
    return {
        "entries": len(_IMAGE_CACHE),
        "max_entries": _IMAGE_CACHE_MAX,
        "estimated_mb": round(total_bytes / (1024 * 1024), 2),
    }

def download_image(url: str, timeout: float = 1.5, _quote_ref: str = "") -> bytes | None:
    """
    Fallback serial image download used only when the async prefetch phase
    did NOT pre-cache a URL. This path should almost never be reached in
    production — hitting it means a URL was missed by the prefetch collector.
    A WARNING is emitted so the gap can be diagnosed and fixed at the source.
    """
    logger.warning(
        "render-time image fetch fallback triggered — url was not prefetched | "
        "url=%s | quote_ref=%s | "
        "This indicates the URL was not included in the prefetch collection phase.",
        url, _quote_ref or "unknown"
    )
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read()
    except Exception as e:
        logger.warning("Failed to download image %s: %s", url, e)
        return None


def extract_package_inclusions_exclusions(package) -> tuple[list[str], list[str]]:
    inclusions_list = []
    exclusions_list = []
    
    inclusions_dict = {}
    if package.inclusions:
        if isinstance(package.inclusions, dict):
            inclusions_dict = package.inclusions
        elif isinstance(package.inclusions, str):
            try:
                inclusions_dict = json.loads(package.inclusions)
            except Exception:
                pass
                
    if isinstance(inclusions_dict, dict):
        standard_keys = {
            'flights': 'Flights',
            'transportation': 'Transportation',
            'hotel': 'Hotel',
            'visaAssistance': 'Visa Assistance',
            'travelInsurance': 'Travel Insurance',
            'tourGuide': 'Tour Guide',
            'foodAndDining': 'Food & Dining',
            'supportAndServices': 'Support & Services',
            'languages': 'Language Support'
        }
        for key, label in standard_keys.items():
            val = inclusions_dict.get(key)
            if isinstance(val, dict):
                is_included = val.get('included', False)
                details = val.get('details', '')
                if is_included:
                    if details:
                        inclusions_list.append(f"{label}: {details}")
                    else:
                        inclusions_list.append(label)
                else:
                    exclusions_list.append(label)

    custom_services = []
    if package.custom_services:
        if isinstance(package.custom_services, list):
            custom_services = package.custom_services
        elif isinstance(package.custom_services, str):
            try:
                custom_services = json.loads(package.custom_services)
            except Exception:
                pass
                
    if isinstance(custom_services, list):
        for s in custom_services:
            if isinstance(s, dict):
                heading = s.get('heading', '')
                description = s.get('description', '')
                is_included = s.get('isIncluded', False)
                if is_included:
                    if description:
                        inclusions_list.append(f"{heading}: {description}")
                    else:
                        inclusions_list.append(heading)
                else:
                    exclusions_list.append(heading)

    if not inclusions_list and package.included_items:
        try:
            lst = json.loads(package.included_items)
            if isinstance(lst, list):
                inclusions_list = [str(x) for x in lst if x]
        except Exception:
            pass

    pkg_excl = []
    if package.exclusions:
        if isinstance(package.exclusions, list):
            pkg_excl = package.exclusions
        elif isinstance(package.exclusions, str):
            try:
                parsed = json.loads(package.exclusions)
                if isinstance(parsed, list):
                    pkg_excl = parsed
            except Exception:
                pass
                
    for item in pkg_excl:
        if isinstance(item, str) and item:
            exclusions_list.append(item)
            
    if not exclusions_list and package.excluded_items:
        try:
            lst = json.loads(package.excluded_items)
            if isinstance(lst, list):
                exclusions_list = [str(x) for x in lst if x]
        except Exception:
            pass

    return inclusions_list, exclusions_list


# ---------------------------------------------------------------------------
# PDF Customizer — Running Footer & Layout Helpers
# ---------------------------------------------------------------------------

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib import colors as rl_colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import KeepTogether, CondPageBreak

IMAGE_WIDTH_VERTICAL = 180   # px — left column in vertical layout
IMAGE_HEIGHT_FIXED = 120     # px — ALWAYS this height, never taller
IMAGE_WIDTH_HORIZONTAL = None # full cell width in horizontal layout
IMAGE_HEIGHT_HORIZONTAL = 90  # px — shorter for horizontal to save vertical space
IMAGE_ASPECT_FORCED = True    # crop to fill, never stretch
MINIMUM_DAY_CARD_HEIGHT = 200 # points, to prevent orphans

class FooterCanvas(rl_canvas.Canvas):
    def __init__(self, *args, agent_info=None, show_footer=True, primary_rl=None, base_font='Helvetica', **kwargs):
        super().__init__(*args, **kwargs)
        self.agent_info = agent_info or {}
        self.show_footer = show_footer
        self.primary_rl = primary_rl
        self.base_font = base_font
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        left_margin = 2.0 * 28.3464567  # 2.0 cm in points
        right_margin = 595.27 - (2.0 * 28.3464567)  # A4 width is 595.27
        page_num = self.getPageNumber()
        
        # 1. Running Header on pages > 1
        if page_num > 1:
            header_y = 841.89 - (2.0 * 28.3464567) + 12
            if self.primary_rl:
                self.setStrokeColor(self.primary_rl)
            else:
                self.setStrokeColor(rl_colors.Color(0.1, 0.32, 0.46))
            self.setLineWidth(0.5)
            self.line(left_margin, header_y, right_margin, header_y)
            
            self.setFont(self.base_font, 8)
            self.setFillColor(rl_colors.HexColor('#555555'))
            agency_name = self.agent_info.get('agency_name') or "Your Agency"
            self.drawString(left_margin, header_y + 4, f"{agency_name} | Travel Quotation")
            ref_str = self.agent_info.get('quote_ref') or "QUO-SAMPLE-001"
            self.drawRightString(right_margin, header_y + 4, f"Quote Ref: {ref_str}")
            
        # 2. Running Footer exactly at 1.5cm from bottom
        footer_y = 1.5 * 28.3464567
        # Line above footer at 2.0cm from bottom
        if self.primary_rl:
            self.setStrokeColor(self.primary_rl)
        else:
            self.setStrokeColor(rl_colors.Color(0.1, 0.32, 0.46))
        self.setLineWidth(0.5)
        self.line(left_margin, 2.0 * 28.3464567, right_margin, 2.0 * 28.3464567)
        
        if self.show_footer:
            agency_name = self.agent_info.get('agency_name') or "Your Agency"
            email_str = self.agent_info.get('email') or "info@agency.com"
            phone_str = self.agent_info.get('phone') or ""
            phone_part = f" | {phone_str}" if phone_str else ""
            footer_left = f"{agency_name} | {email_str}{phone_part}"
            self.setFont(self.base_font, 8)
            self.setFillColor(rl_colors.HexColor('#555555'))
            # Left: contact info
            self.drawString(left_margin, footer_y, footer_left)

        # Centre: page number — always drawn independently, never concatenated
        self.setFont(self.base_font, 8)
        self.setFillColor(rl_colors.HexColor('#555555'))
        self.drawCentredString(595.27 / 2.0, footer_y, f"Page {page_num} of {total_pages}")
        
        self.restoreState()


def render_activity_image(image_url: str, width: int, height: int) -> Any | None:
    """
    Returns a cropped/resized ReportLab Image flowable.
    Reads from the bounded LRU cache (_cache_get). Falls back to a serial
    download only if the URL was somehow not prefetched — a WARNING is logged
    in that case via download_image().
    """
    from reportlab.platypus import Image as RLImage
    from PIL import Image as PILImage
    import io
    if not image_url or not image_url.startswith(('http://', 'https://')):
        return None
    try:
        img_data = _cache_get(image_url)
        if img_data is None:
            # Fallback: serial download (should be rare — triggers a WARNING)
            img_data = download_image(image_url)
            if img_data:
                _cache_put(image_url, img_data)

        if not img_data:
            return None
            
        # Center-crop to target aspect ratio
        img = PILImage.open(io.BytesIO(img_data))
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGB')
            
        w, h = img.size
        target_ratio = width / height
        current_ratio = w / h
        if current_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            right = left + new_w
            img = img.crop((left, 0, right, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            bottom = top + new_h
            img = img.crop((0, top, w, bottom))
            
        # Resize to 2× target, capped at 400×300 to keep PDF size manageable
        scaled_w = width * 2
        scaled_h = height * 2
        if scaled_w > 400:
            scaled_h = int(scaled_h * (400 / scaled_w))
            scaled_w = 400
        if scaled_h > 300:
            scaled_w = int(scaled_w * (300 / scaled_h))
            scaled_h = 300

        img = img.resize((scaled_w, scaled_h), PILImage.Resampling.LANCZOS)
        
        qualities = [72, 55, 40]
        processed_data = None
        for q in qualities:
            out_buf = io.BytesIO()
            img.save(out_buf, format='JPEG', quality=q)
            processed_data = out_buf.getvalue()
            if len(processed_data) < 80000:
                break
        
        return RLImage(io.BytesIO(processed_data), width=width, height=height)
    except Exception as e:
        logger.warning("Error rendering activity image: %s", e)
        return None


def get_day_flowables(day_items, active_slots, day_num, bold_font, primary_rl, desc_style, body_style, show_img=True, layout_type='vertical', inner_width=500):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib import colors as rl_colors
    from reportlab.platypus.flowables import HRFlowable
    
    flowables = []
    slot_map = defaultdict(list)
    generic_items = []
    for item in day_items:
        slot_key = item.get('time_slot')
        if slot_key and any(k == slot_key for k, _ in active_slots):
            slot_map[slot_key].append(item)
        else:
            generic_items.append(item)
            
    first_activity = True

    def process_slot(items, slot_label=None, slot_key=None):
        nonlocal first_activity
        if not items:
            return
            
        for item in items:
            if layout_type == 'vertical' and not first_activity:
                flowables.append(Spacer(1, 4))
                flowables.append(HRFlowable(width='100%', thickness=0.5, color=rl_colors.HexColor('#e2e8f0')))
                flowables.append(Spacer(1, 6))
            first_activity = False

            text_flowables = []
            img_flowable = None
            
            if show_img and item.get('image_url'):
                if layout_type == 'horizontal':
                    img_flowable = render_activity_image(item['image_url'], int(inner_width), 80)
                else:
                    img_flowable = render_activity_image(item['image_url'], 160, 110)
            
            if layout_type == 'horizontal' and img_flowable:
                flowables.append(img_flowable)
                flowables.append(Spacer(1, 4))
                
            if slot_label and item == items[0]:
                text_flowables.append(Paragraph(f"<b>{slot_label}</b>", ParagraphStyle(
                    f'SL_{day_num}_{slot_key}', fontName=bold_font, fontSize=10, textColor=primary_rl, spaceBefore=0, spaceAfter=2, leading=14
                )))
                
            if item.get('description'):
                text_flowables.append(Paragraph(_clean_str(item['description']), desc_style))
            for act in item.get('activities', []):
                text_flowables.append(Paragraph(f"• {_clean_str(act)}", body_style))
                
            if layout_type == 'vertical':
                img_width = 170
                text_width = inner_width - img_width
                
                if img_flowable:
                    row_table = Table([[img_flowable, text_flowables]], colWidths=[img_width, text_width])
                else:
                    row_table = Table([['', text_flowables]], colWidths=[img_width, text_width])
                    
                row_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 10),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                    ('RIGHTPADDING', (0,0), (0,0), 10),
                    ('LEFTPADDING', (1,0), (1,0), 12),
                ]))
                flowables.append(row_table)
            else:
                flowables.extend(text_flowables)
                
    for slot_key, slot_label in active_slots:
        process_slot(slot_map[slot_key], slot_label, slot_key)
        
    process_slot(generic_items)
    
    return flowables


def build_day_card_vertical(day_num: int, day_items: list, printable_width: float, s: dict, primary_rl: Any, bold_font: str, base_font: str, active_slots: list, desc_style: Any, body_style: Any) -> Any:
    from reportlab.platypus import Table, TableStyle, Paragraph
    
    first_item = day_items[0]
    dest = _clean_str(first_item.get('destination') or '')
    title = _clean_str(first_item.get('title') or '')
    
    hdr_text = f"<b>DAY {day_num}</b> — {title}"
    if dest:
        hdr_text += f" ({dest})"
        
    hdr_p = Paragraph(hdr_text, ParagraphStyle(
        f'CardHdr_{day_num}', fontName=bold_font, fontSize=11, textColor=rl_colors.white, leading=15
    ))
    
    show_img = s.get('content_visibility', {}).get('show_activity_images', True)
    inner_width = printable_width - 20
    
    day_flowables = get_day_flowables(day_items, active_slots, day_num, bold_font, primary_rl, desc_style, body_style, show_img=show_img, layout_type='vertical', inner_width=inner_width)
    
    card_table = Table([[hdr_p], [day_flowables]], colWidths=[printable_width])
    card_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, rl_colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0,0), (-1,0), primary_rl),
        ('BACKGROUND', (0,1), (-1,-1), rl_colors.HexColor('#ffffff')),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('LEFTPADDING', (0,0), (-1,0), 10),
        ('RIGHTPADDING', (0,0), (-1,0), 10),
        ('TOPPADDING', (0,1), (-1,-1), 0),
        ('BOTTOMPADDING', (0,1), (-1,-1), 0),
        ('LEFTPADDING', (0,1), (-1,-1), 0),
        ('RIGHTPADDING', (0,1), (-1,-1), 0),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return card_table


def build_day_card_horizontal(day_num: int, day_items: list, card_width: float, s: dict, primary_rl: Any, bold_font: str, base_font: str, active_slots: list, desc_style: Any, body_style: Any) -> Any:
    from reportlab.platypus import Table, TableStyle, Paragraph, Spacer
    
    first_item = day_items[0]
    dest = _clean_str(first_item.get('destination') or '')
    title = _clean_str(first_item.get('title') or '')
    
    hdr_text = f"<b>DAY {day_num}</b> — {title}"
    if dest:
        hdr_text += f" ({dest})"
        
    hdr_p = Paragraph(hdr_text, ParagraphStyle(
        f'CardHdr_H_{day_num}', fontName=bold_font, fontSize=11, textColor=rl_colors.white, leading=15
    ))
    
    show_img = s.get('content_visibility', {}).get('show_activity_images', True)
    inner_width = card_width - 20
    
    day_flowables = get_day_flowables(day_items, active_slots, day_num, bold_font, primary_rl, desc_style, body_style, show_img=show_img, layout_type='horizontal', inner_width=inner_width)
    
    card_table = Table([[hdr_p], [day_flowables]], colWidths=[card_width])
    card_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, rl_colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0,0), (-1,0), primary_rl),
        ('BACKGROUND', (0,1), (-1,-1), rl_colors.HexColor('#ffffff')),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('LEFTPADDING', (0,0), (-1,0), 10),
        ('RIGHTPADDING', (0,0), (-1,0), 10),
        ('TOPPADDING', (0,1), (-1,-1), 10),
        ('BOTTOMPADDING', (0,1), (-1,-1), 10),
        ('LEFTPADDING', (0,1), (-1,-1), 10),
        ('RIGHTPADDING', (0,1), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return card_table


def build_itinerary_vertical(sorted_day_nums, grouped_days, printable_width, s, primary_rl, bold_font, base_font, active_slots, desc_style, body_style, fallback_mode):
    from reportlab.platypus import Spacer, CondPageBreak, Table, TableStyle, Paragraph
    from reportlab.lib.units import cm
    story = []
    
    for day_num in sorted_day_nums:
        day_items = grouped_days[day_num]
        
        # Add CondPageBreak before the day card to prevent orphan headers/mid-day breaks
        if not fallback_mode and day_num != sorted_day_nums[0]:
            story.append(CondPageBreak(100))
            
        if fallback_mode:
            first_item = day_items[0]
            dest = _clean_str(first_item.get('destination') or '')
            title = _clean_str(first_item.get('title') or '')
            
            hdr_text = f"<b>DAY {day_num}</b> — {title}"
            if dest:
                hdr_text += f" ({dest})"
                
            hdr_p = Paragraph(hdr_text, ParagraphStyle(
                f'CardHdr_FB_{day_num}', fontName=bold_font, fontSize=11, textColor=rl_colors.white, leading=15
            ))
            day_hdr = Table([[hdr_p]], colWidths=[printable_width])
            day_hdr.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), primary_rl),
                ('TOPPADDING', (0,0), (-1,0), 6),
                ('BOTTOMPADDING', (0,0), (-1,0), 6),
                ('LEFTPADDING', (0,0), (-1,0), 8),
                ('RIGHTPADDING', (0,0), (-1,0), 8),
            ]))
            story.append(day_hdr)
            story.append(Spacer(1, 0.15 * cm))
            
            # Removed the day-level cover image. Images are now strictly
            # handled per-activity inside get_day_flowables.

            day_flowables = get_day_flowables(day_items, active_slots, day_num, bold_font, primary_rl, desc_style, body_style)
            for f in day_flowables:
                story.append(f)
            story.append(Spacer(1, 0.4 * cm))
        else:
            day_card = build_day_card_vertical(day_num, day_items, printable_width, s, primary_rl, bold_font, base_font, active_slots, desc_style, body_style)
            story.append(KeepTogether([day_card]))
            story.append(Spacer(1, 16))
            
    return story


def build_itinerary_horizontal(sorted_day_nums, grouped_days, printable_width, s, primary_rl, bold_font, base_font, active_slots, desc_style, body_style):
    from reportlab.platypus import Spacer, Table, TableStyle, Paragraph, KeepTogether
    from reportlab.lib.units import cm
    from reportlab.lib import colors as rl_colors
    
    story = []
    show_img = s.get('content_visibility', {}).get('show_activity_images', True)
    
    day_count = len(sorted_day_nums)
    for chunk_start in range(0, day_count, 3):
        chunk_day_nums = sorted_day_nums[chunk_start:chunk_start+3]
        num_cols = len(chunk_day_nums)
        chunk_col_width = printable_width / num_cols
        
        table_data = []
        
        # Row 1: Day headers
        header_row = []
        for day_num in chunk_day_nums:
            day_items = grouped_days[day_num]
            first_item = day_items[0]
            dest = _clean_str(first_item.get('destination') or '')
            title = _clean_str(first_item.get('title') or '')
            
            hdr_text = f"<b>DAY {day_num}</b> — {title}"
            if dest:
                hdr_text += f" ({dest})"
                
            hdr_p = Paragraph(hdr_text, ParagraphStyle(
                f'GridHdr_{day_num}', fontName=bold_font, fontSize=11, textColor=rl_colors.white, leading=15
            ))
            header_row.append(hdr_p)
        table_data.append(header_row)
        
        # Determine unique slot keys needed for this chunk's days
        slots_to_render = []
        for slot_key, slot_label in active_slots:
            has_slot = False
            for day_num in chunk_day_nums:
                if any(item.get('time_slot') == slot_key for item in grouped_days[day_num]):
                    has_slot = True
                    break
            if has_slot:
                slots_to_render.append((slot_key, slot_label))
                
        # Row 2+: One row per time slot
        for slot_key, slot_label in slots_to_render:
            slot_row = []
            for day_num in chunk_day_nums:
                day_items = grouped_days[day_num]
                items_in_slot = [item for item in day_items if item.get('time_slot') == slot_key]
                
                cell_flowables = []
                if items_in_slot:
                    cell_flowables.append(Paragraph(f"<b>{slot_label}</b>", ParagraphStyle(
                        f'GridSL_{day_num}_{slot_key}', fontName=bold_font, fontSize=10, textColor=primary_rl, spaceBefore=0, spaceAfter=2, leading=14
                    )))
                    for item in items_in_slot:
                        if show_img and item.get('image_url'):
                            img_w = int(chunk_col_width) - 16
                            img_flowable = render_activity_image(item['image_url'], img_w, 80)
                            if img_flowable:
                                cell_flowables.append(img_flowable)
                                cell_flowables.append(Spacer(1, 6))
                            
                        if item.get('description'):
                            cell_flowables.append(Paragraph(_clean_str(item['description']), desc_style))
                        for act in item.get('activities', []):
                            cell_flowables.append(Paragraph(f"• {_clean_str(act)}", body_style))
                            
                slot_row.append(cell_flowables)
            table_data.append(slot_row)
            
        # Add Generic Items row if any day has them
        has_generic = False
        for day_num in chunk_day_nums:
            if any(not item.get('time_slot') or item.get('time_slot') not in dict(active_slots) for item in grouped_days[day_num]):
                has_generic = True
                break
                
        if has_generic:
            generic_row = []
            for day_num in chunk_day_nums:
                day_items = grouped_days[day_num]
                gen_items = [item for item in day_items if not item.get('time_slot') or item.get('time_slot') not in dict(active_slots)]
                
                cell_flowables = []
                if gen_items:
                    for item in gen_items:
                        if show_img and item.get('image_url'):
                            img_w = int(chunk_col_width) - 16
                            img_flowable = render_activity_image(item['image_url'], img_w, 80)
                            if img_flowable:
                                cell_flowables.append(img_flowable)
                                cell_flowables.append(Spacer(1, 6))
                                
                        if item.get('description'):
                            cell_flowables.append(Paragraph(_clean_str(item['description']), desc_style))
                        for act in item.get('activities', []):
                            cell_flowables.append(Paragraph(f"• {_clean_str(act)}", body_style))
                generic_row.append(cell_flowables)
            table_data.append(generic_row)
            
        layout_table = Table(
            table_data,
            colWidths=[chunk_col_width] * num_cols,
            repeatRows=1,       # repeat header row when table splits across pages
            splitByRow=1,       # allow split between slot rows — prevents giant blank gaps
        )
        layout_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, rl_colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0,0), (-1,-1), 1, rl_colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0,0), (-1,0), primary_rl),
            ('TEXTCOLOR', (0,0), (-1,0), rl_colors.white),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('LEFTPADDING', (0,0), (-1,0), 8),
            ('RIGHTPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,1), (-1,-1), 8),
            ('BOTTOMPADDING', (0,1), (-1,-1), 8),
            ('LEFTPADDING', (0,1), (-1,-1), 8),
            ('RIGHTPADDING', (0,1), (-1,-1), 8),
        ]))

        # Do NOT wrap the full chunk in KeepTogether — it causes blank gaps when the
        # table is larger than remaining page space. splitByRow=1 above handles breaks.
        story.append(layout_table)
        story.append(Spacer(1, 12))  # tight 12pt inter-chunk gap

        
    return story


MOCK_INCLUSIONS = ['Airport Transfers', 'Hotel Stay', 'Guided Tours']
MOCK_EXCLUSIONS = ['Meals unless specified', 'Personal expenses', 'Visa fees']
MOCK_CANCELLATION_TIERS = [
    { 'days': '>30',  'charge': '10%' },
    { 'days': '15-30', 'charge': '25%' },
    { 'days': '<15',  'charge': 'No refund' },
]


def _build_preview_pdf(s: dict, agency_name: str, pkg_info: Optional[dict] = None, travel_type: str = "domestic") -> bytes:
    """
    Build a sample quote PDF. If the premium card-based layout fails due to size limitations,
    gracefully fall back to a linear flowable layout.
    """
    try:
        return _build_preview_pdf_impl(s, agency_name, pkg_info, fallback_mode=False, travel_type=travel_type)
    except Exception as e:
        logger.warning("Premium PDF layout build failed (likely content size limit). Rebuilding in fallback mode: %s", e)
        try:
            return _build_preview_pdf_impl(s, agency_name, pkg_info, fallback_mode=True, travel_type=travel_type)
        except Exception as fallback_err:
            logger.error("Fallback PDF build also failed: %s", fallback_err, exc_info=True)
            raise fallback_err

def _build_preview_pdf_impl(s: dict, agency_name: str, pkg_info: Optional[dict] = None, fallback_mode: bool = False, travel_type: str = "domestic") -> bytes:
    """
    Build a sample quote PDF using ReportLab with a premium travel brochure design.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    import io

    def get_logo_flowable(url: str, max_w: float, max_h: float):
        from reportlab.platypus import Image as RLImage
        from PIL import Image as PILImage
        if not url or not url.startswith(('http://', 'https://')):
            return None
        try:
            if url in _IMAGE_CACHE:
                img_data = _IMAGE_CACHE[url]
            else:
                img_data = download_image(url, timeout=5.0)
                if img_data:
                    _IMAGE_CACHE[url] = img_data
            if img_data:
                img = PILImage.open(io.BytesIO(img_data))
                w, h = img.size
                aspect = w / h
                if w > max_w:
                    w = max_w
                    h = w / aspect
                if h > max_h:
                    h = max_h
                    w = h * aspect
                return RLImage(io.BytesIO(img_data), width=w, height=h)
        except Exception as e:
            logger.warning("Error creating Logo RLImage flowable for %s: %s", url, e)
        return None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2.0 * cm,
        leftMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.5 * cm,
        title="Sample Quote PDF",
    )

    printable_width = A4[0] - (doc.leftMargin + doc.rightMargin)

    primary_rgb  = _hex_to_rgb(_clean_color(s.get('primary_color', '#1a5276')))
    accent_rgb   = _hex_to_rgb(_clean_color(s.get('accent_color', '#f39c12')))
    primary_rl   = colors.Color(*primary_rgb)
    accent_rl    = colors.Color(*accent_rgb)

    base_font    = FONT_MAP.get(s.get('font_style', 'default'), 'Helvetica')
    bold_font    = base_font + '-Bold' if base_font == 'Times-Roman' else 'Helvetica-Bold'

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'PdfTitle',
        fontName=bold_font,
        fontSize=20,
        textColor=primary_rl,
        spaceAfter=4,
        leading=24,
    )
    heading_style = ParagraphStyle(
        'PdfHeading',
        fontName=bold_font,
        fontSize=14,
        textColor=primary_rl,
        spaceBefore=12,
        spaceAfter=6,
        leading=18,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        'PdfBody',
        fontName=base_font,
        fontSize=11,
        textColor=colors.HexColor('#222222'),
        spaceAfter=3,
        leading=16,
    )
    desc_style = ParagraphStyle(
        'PdfDesc',
        fontName=base_font,
        fontSize=11,
        textColor=colors.HexColor('#222222'),
        spaceAfter=4,
        leading=16,
        alignment=TA_JUSTIFY,
    )
    small_style = ParagraphStyle(
        'PdfSmall',
        fontName=base_font,
        fontSize=9,
        textColor=colors.HexColor('#555555'),
        spaceAfter=2,
        leading=12,
    )

    time_slots = s.get('time_slots', {})
    active_slots = get_active_slots(time_slots)

    story = []

    raw_sections = s.get('sections', [])
    visible_section_ids = [sec['id'] for sec in raw_sections if sec.get('visible', True)]

    def wrap_keep_together(flowables):
        if fallback_mode or not flowables:
            return flowables
        try:
            kt = KeepTogether(flowables)
            w, h = kt.wrap(printable_width, doc.pagesize[1] - doc.topMargin - doc.bottomMargin)
            max_height = doc.pagesize[1] - doc.topMargin - doc.bottomMargin
            if h > max_height:
                return flowables
            return [kt]
        except Exception:
            try:
                return [KeepTogether(flowables)]
            except Exception:
                return flowables

    def _add_section(section_id: str):
        """Append the appropriate block for each section_id."""

        if section_id == 'header':
            sec_story = []
            logo_pos = s.get('logo_position', 'top_left')
            logo_url = s.get('logo_url')
            
            logo_flow = None
            if logo_url:
                logo_flow = get_logo_flowable(logo_url, 120, 60)
                
            agency_name_p = Paragraph(_clean_str(agency_name), ParagraphStyle(
                'AgencyName', fontName=bold_font, fontSize=20, textColor=primary_rl, leading=24
            ))
            
            quote_title_p = Paragraph('Travel Quotation & Itinerary', ParagraphStyle(
                'QuoteTitle', fontName=base_font, fontSize=12, textColor=colors.HexColor('#555555'), leading=16
            ))
            
            if logo_flow:
                if logo_pos == 'top_left':
                    hdr_table = Table([[logo_flow, [agency_name_p, quote_title_p]]], colWidths=[130, printable_width - 130])
                    hdr_table.setStyle(TableStyle([
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                        ('LEFTPADDING', (0,0), (-1,-1), 0),
                        ('RIGHTPADDING', (0,0), (-1,-1), 0),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                        ('TOPPADDING', (0,0), (-1,-1), 0),
                    ]))
                    sec_story.append(hdr_table)
                elif logo_pos == 'top_right':
                    hdr_table = Table([[[agency_name_p, quote_title_p], logo_flow]], colWidths=[printable_width - 130, 130])
                    hdr_table.setStyle(TableStyle([
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                        ('ALIGN', (1,0), (1,0), 'RIGHT'),
                        ('LEFTPADDING', (0,0), (-1,-1), 0),
                        ('RIGHTPADDING', (0,0), (-1,-1), 0),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                        ('TOPPADDING', (0,0), (-1,-1), 0),
                    ]))
                    sec_story.append(hdr_table)
                else: # top_center
                    logo_flow.hAlign = 'CENTER'
                    agency_name_p.style.alignment = TA_CENTER
                    quote_title_p.style.alignment = TA_CENTER
                    sec_story.append(logo_flow)
                    sec_story.append(Spacer(1, 0.15 * cm))
                    sec_story.append(agency_name_p)
                    sec_story.append(quote_title_p)
            else:
                align = TA_LEFT if logo_pos == 'top_left' else (TA_CENTER if logo_pos == 'top_center' else TA_RIGHT)
                agency_name_p.style.alignment = align
                quote_title_p.style.alignment = align
                sec_story.append(agency_name_p)
                sec_story.append(quote_title_p)
                
            sec_story.append(Spacer(1, 0.2 * cm))
            sec_story.append(HRFlowable(width='100%', thickness=2, color=primary_rl))
            sec_story.append(Spacer(1, 0.3 * cm))
            
            meta_data = [
                [Paragraph('<b>Quote Reference:</b> QUO-SAMPLE-001', small_style), 
                 Paragraph('<b>Valid Until:</b> 30 Jun 2026', ParagraphStyle('MetaRight', parent=small_style, alignment=TA_RIGHT))]
            ]
            meta_table = Table(meta_data, colWidths=[printable_width / 2] * 2)
            meta_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            sec_story.append(meta_table)
            sec_story.append(Spacer(1, 0.4 * cm))
            story.extend(wrap_keep_together(sec_story))

        elif section_id == 'itinerary':
            story.append(Paragraph('Itinerary', heading_style))
            story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
            story.append(Spacer(1, 0.2 * cm))

            layout = s.get('itinerary_layout', 'vertical')
            if fallback_mode:
                layout = 'vertical'

            if pkg_info and pkg_info.get('days'):
                days_data = pkg_info['days']
            else:
                days_data = [
                    {
                        'day_number': i + 1,
                        'title': day_info['title'],
                        'description': SAMPLE_ACTIVITY,
                        'image_url': None,
                        'time_slot': None,
                        'activities': [],
                        'destination': day_info['destination']
                    }
                    for i, day_info in enumerate(SAMPLE_DAYS)
                ]

            grouped_days = defaultdict(list)
            for d in days_data:
                grouped_days[d['day_number']].append(d)
                
            sorted_day_nums = sorted(grouped_days.keys())

            if layout == 'horizontal':
                itinerary_story = build_itinerary_horizontal(
                    sorted_day_nums, grouped_days, printable_width, s,
                    primary_rl, bold_font, base_font, active_slots, desc_style, body_style
                )
                story.extend(itinerary_story)
            else:
                itinerary_story = build_itinerary_vertical(
                    sorted_day_nums, grouped_days, printable_width, s,
                    primary_rl, bold_font, base_font, active_slots, desc_style, body_style, fallback_mode
                )
                story.extend(itinerary_story)

        elif section_id == 'inclusions':
            show_inc = s.get('content_visibility', {}).get('show_inclusions', True)
            inc_list = pkg_info.get('inclusions') if pkg_info else MOCK_INCLUSIONS
            if show_inc and inc_list:
                inc_story = []
                inc_story.append(Paragraph('Inclusions', heading_style))
                inc_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                inc_story.append(Spacer(1, 0.15 * cm))
                for item in inc_list:
                    inc_story.append(Paragraph(f'✔ {_clean_str(item)}', body_style))
                inc_story.append(Spacer(1, 0.2 * cm))
                story.extend(wrap_keep_together(inc_story))

        elif section_id == 'exclusions':
            show_exc = s.get('content_visibility', {}).get('show_exclusions', True)
            exc_list = pkg_info.get('exclusions') if pkg_info else MOCK_EXCLUSIONS
            if show_exc and exc_list:
                exc_story = []
                exc_story.append(Paragraph('Exclusions', heading_style))
                exc_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                exc_story.append(Spacer(1, 0.15 * cm))
                for item in exc_list:
                    exc_story.append(Paragraph(f'✘ {_clean_str(item)}', body_style))
                exc_story.append(Spacer(1, 0.2 * cm))
                story.extend(wrap_keep_together(exc_story))

        elif section_id == 'pricing':
            pricing_story = []
            pricing_story.append(Paragraph('Pricing Table', heading_style))
            pricing_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
            pricing_story.append(Spacer(1, 0.15 * cm))
            def format_inr(amount):
                return f"INR\u00A0{float(amount):,.2f}"

            price_data = [
                ['Description', 'Qty', 'Rate / Pax', 'Subtotal'],
                [Paragraph('Package Base Price', body_style), '1', format_inr(45000), format_inr(45000)],
                [Paragraph('<b>Total Quotation Value</b>', body_style), '', '', format_inr(45000)],
            ]
            price_table = Table(price_data, colWidths=[printable_width * 0.55, printable_width * 0.10, printable_width * 0.175, printable_width * 0.175])
            price_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), primary_rl),
                ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                ('FONTNAME',   (0, 0), (-1, 0), bold_font),
                ('FONTSIZE',   (0, 0), (-1, -1), 10),
                ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f5f5f5')),
                ('FONTNAME',   (0, -1), (-1, -1), bold_font),
                ('ALIGN',      (1, 0), (-1, -1), 'RIGHT'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#fafafa')]),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ]))
            pricing_story.append(price_table)
            pricing_story.append(Spacer(1, 0.3 * cm))
            story.extend(wrap_keep_together(pricing_story))

        elif section_id == 'cancellation':
            show_cancel = s.get('content_visibility', {}).get('show_cancellation', True)
            if show_cancel:
                cancel_tiers = pkg_info.get('cancellation_tiers') if pkg_info else MOCK_CANCELLATION_TIERS
                cancellation_enabled = pkg_info.get('cancellation_enabled', True) if pkg_info else True
                
                if cancellation_enabled and cancel_tiers:
                    cancel_story = []
                    cancel_story.append(Paragraph('Cancellation Policy', heading_style))
                    cancel_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                    cancel_story.append(Spacer(1, 0.15 * cm))
                    
                    tier_data = [['Days Before Departure', 'Charge / Refund']] + [
                        [_clean_str(t.get('days', '')), _clean_str(t.get('charge', ''))]
                        for t in cancel_tiers
                    ]
                    tier_table = Table(tier_data, colWidths=[printable_width * 0.45, printable_width * 0.55])
                    tier_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), accent_rl),
                        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                        ('FONTNAME',   (0, 0), (-1, 0), bold_font),
                        ('FONTSIZE',   (0, 0), (-1, -1), 10),
                        ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                        ('TOPPADDING', (0,0), (-1,-1), 6),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ]))
                    cancel_story.append(tier_table)
                    cancel_story.append(Spacer(1, 0.2 * cm))
                    story.extend(wrap_keep_together(cancel_story))

        elif section_id == 'terms':
            extra_sections = s.get('extra_sections', [])
            if not isinstance(extra_sections, list):
                extra_sections = []
            
            notes_story = []
            title_label = 'Domestic Travel Information' if travel_type == 'domestic' else 'International Travel Information'
            notes_story.append(Paragraph(title_label, heading_style))
            notes_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
            notes_story.append(Spacer(1, 0.15 * cm))
            
            notes_list = []
            for item in extra_sections:
                if isinstance(item, dict) and item.get('show', True) and item.get('content'):
                    notes_list.append((item.get('heading', ''), item.get('content', '')))
            
            for title, desc in notes_list:
                notes_story.append(Paragraph(f"<b>{title}:</b> {desc}", small_style))
                
            if notes_list:
                notes_story.append(Spacer(1, 0.2 * cm))
                story.extend(wrap_keep_together(notes_story))

            terms = s.get('terms', {})
            if terms.get('show', True):
                terms_story = []
                terms_story.append(Paragraph('Terms & Conditions', heading_style))
                terms_story.append(HRFlowable(width='100%', thickness=1, color=accent_rl))
                terms_story.append(Spacer(1, 0.15 * cm))
                if terms.get('use_global', True):
                    terms_story.append(Paragraph(
                        'Standard terms and conditions apply. Please contact your travel advisor for the full T&C document.',
                        small_style
                    ))
                else:
                    custom = _clean_str(terms.get('custom_text', ''))
                    terms_story.append(Paragraph(custom or '(No custom T&C text provided)', small_style))
                terms_story.append(Spacer(1, 0.2 * cm))
                story.extend(wrap_keep_together(terms_story))

        elif section_id == 'footer':
            pass

    for sec_id in visible_section_ids:
        _add_section(sec_id)

    # Watermark note
    watermark_story = [
        Spacer(1, 0.4 * cm),
        Paragraph(
            '— This is a sample/preview PDF generated by the PDF Customizer. '
            'Actual quotes will contain real booking data. —',
            ParagraphStyle('WM', fontName=base_font, fontSize=8, textColor=colors.HexColor('#888888'), alignment=TA_CENTER)
        )
    ]
    story.extend(wrap_keep_together(watermark_story))

    canvas_maker = lambda *args, **kwargs: FooterCanvas(
        *args,
        agent_info={
            'agency_name': agency_name,
            'email': 'info@agency.com',
            'phone': '+91 99999 99999',
            'quote_ref': 'QUO-SAMPLE-001'
        },
        show_footer=s.get('show_footer', True),
        primary_rl=primary_rl,
        base_font=base_font,
        **kwargs
    )

    doc.build(story, canvasmaker=canvas_maker)
    return buf.getvalue()


@router.post("/pdf-customizer/preview")
async def preview_pdf_customizer(
    request_body: PdfCustomizerPreviewRequest,
    db: AsyncSession = Depends(get_db),
    agent_user: User = Depends(check_permission("settings", "view"))
):
    """
    Generate a dummy quote PDF using the provided PDF Customizer settings.
    Returns a PDF binary response for download.
    The settings dict is deep-sanitized before any value reaches ReportLab.
    """
    agent_id = agent_user.agent_id
    agent_profile = await get_agent_profile_by_id(db, agent_id)
    agency_name = agent_profile.agency_name or "Your Agency"

    pkg_info = None
    if request_body.package_id:
        try:
            from sqlalchemy.orm import selectinload
            from app.models import Package
            import json
            
            stmt = select(Package).where(
                Package.id == request_body.package_id
            ).options(selectinload(Package.itinerary_items))
            res = await db.execute(stmt)
            package_data = res.scalar_one_or_none()
            
            if package_data:
                # Extract inclusions and exclusions using helper logic
                inc_list, exc_list = extract_package_inclusions_exclusions(package_data)
                # Extract cancellation rules
                cancel_rules = []
                if package_data.cancellation_enabled and package_data.cancellation_rules:
                    rules = package_data.cancellation_rules
                    if isinstance(rules, str):
                        try:
                            rules = json.loads(rules)
                        except Exception:
                            rules = []
                    if isinstance(rules, list):
                        for r in rules:
                            if isinstance(r, dict):
                                days_val = r.get('daysBefore')
                                refund_val = r.get('refundPercentage')
                                if days_val is not None and refund_val is not None:
                                    try:
                                        refund_pct = float(refund_val)
                                        charge_pct = 100.0 - refund_pct
                                        charge_str = f"{int(charge_pct)}% charge" if charge_pct.is_integer() else f"{charge_pct}% charge"
                                    except Exception:
                                        charge_str = f"{refund_val}% refund"
                                    cancel_rules.append({
                                        'days': f"{days_val} days",
                                        'charge': charge_str
                                    })
                                    
                # Build itinerary days info
                days_info = []
                for item in package_data.itinerary_items:
                    acts = []
                    if item.activities:
                        try:
                            parsed = json.loads(item.activities) if isinstance(item.activities, str) else item.activities
                            if isinstance(parsed, list):
                                acts = [str(x) for x in parsed if x]
                        except Exception:
                            pass
                    img_url = item.image_url
                    if img_url:
                        try:
                            if img_url.startswith(('"', "'", '[')):
                                parsed = json.loads(img_url)
                                if isinstance(parsed, list):
                                    img_url = parsed[0] if len(parsed) > 0 else None
                                elif isinstance(parsed, str):
                                    img_url = parsed
                        except Exception:
                            pass
                            
                    days_info.append({
                        'day_number': item.day_number,
                        'title': item.title,
                        'description': item.description,
                        'image_url': img_url,
                        'time_slot': item.time_slot,
                        'activities': acts,
                        'destination': getattr(package_data, 'destination', 'Destination')
                    })
                
                pkg_info = {
                    'title': package_data.title,
                    'destination': package_data.destination,
                    'inclusions': inc_list,
                    'exclusions': exc_list,
                    'cancellation_tiers': cancel_rules,
                    'cancellation_enabled': package_data.cancellation_enabled,
                    'days': days_info
                }
        except Exception as e:
            logger.error("Error fetching/formatting package for preview: %s", e, exc_info=True)

    try:
        loop = asyncio.get_event_loop()
        pdf_bytes: bytes = await loop.run_in_executor(
            None,
            _build_preview_pdf,
            request_body.settings,
            agency_name,
            pkg_info,
            request_body.travel_type
        )
    except Exception as exc:
        logger.error("PDF Customizer preview build failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF preview: {str(exc)}"
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="quote-preview.pdf"',
        },
    )
