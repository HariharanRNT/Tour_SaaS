from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Enquiry, Package, Booking, User, UserRole, Agent,
    EnquiryStatus, BookingStatus, PaymentStatus, 
    EnquiryPaymentType
)
from app.schemas import (
    EnquiryCreate, EnquiryUpdate, EnquiryResponse, 
    EnquiryListResponse, EnquiryConversionResponse,
    BookingResponse
)
from app.api.deps import get_current_user, get_optional_current_user, get_current_domain, check_permission
from app.core.exceptions import NotFoundException, BadRequestException
from app.config import settings
from app.utils.crypto import decrypt_value
from app.services.notification_service import NotificationService
from app.services.gemini_service import gemini_service
from app.services.pdf_service import pdf_service
from app.models import EnquiryQuote
from app.schemas import (
    EnquiryCreate, EnquiryUpdate, EnquiryResponse, 
    EnquiryListResponse, EnquiryConversionResponse,
    BookingResponse, EnquiryAnalyzeResponse,
    EnquiryQuoteCreate, EnquiryQuoteResponse,
    EnquiryQuoteHistoryResponse
)
import razorpay
import json
import random
import string
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()

def generate_booking_reference() -> str:
    """Generate a unique booking reference"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=6))
    return f"BK{letters}{numbers}"


def _build_enquiry_email_html(
    agent_name: str,
    customer_name: str,
    package_title: str,
    travel_date: str,
    travellers: int,
    email: str,
    phone: str,
    message: Optional[str],
    enquiry_id: str
) -> str:
    """Build a styled HTML email body for the agent enquiry alert."""
    travel_date_str = str(travel_date)
    message_section = f"""
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                <strong style="color:#555;">Message:</strong><br/>
                <em style="color:#333;">{message}</em>
            </td>
        </tr>""" if message else ""

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding: 40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 32px; text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;">✈️ New Enquiry Received!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Someone is interested in your package</p>
              </td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
                <p style="color:#333;font-size:16px;">Hi <strong>{agent_name}</strong>,</p>
                <p style="color:#555;">You have a new enquiry for <strong>{package_title}</strong>. Here are the details:</p>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8f9ff;border-radius:12px;padding:20px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                      <strong style="color:#555;">Customer:</strong>
                      <span style="color:#333;float:right;">{customer_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                      <strong style="color:#555;">Email:</strong>
                      <span style="color:#333;float:right;">{email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                      <strong style="color:#555;">Phone:</strong>
                      <span style="color:#333;float:right;">{phone}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                      <strong style="color:#555;">Travel Date:</strong>
                      <span style="color:#333;float:right;">{travel_date_str}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                      <strong style="color:#555;">Travellers:</strong>
                      <span style="color:#333;float:right;">{travellers} guest{'s' if travellers != 1 else ''}</span>
                    </td>
                  </tr>
                  {message_section}
                </table>
                
                <div style="text-align:center;margin-top:28px;">
                  <a href="{settings.FRONTEND_URL}/agent/enquiries"
                     style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
                    View Enquiry →
                  </a>
                </div>
                
                <p style="color:#999;font-size:12px;text-align:center;margin-top:32px;">
                  Reply directly to the customer's email or manage this enquiry from your Agent Portal.
                </p>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background:#f8f9ff;padding:20px;text-align:center;border-top:1px solid #f0f0f0;">
                <p style="margin:0;color:#aaa;font-size:12px;">© 2026 TourSaaS · All rights reserved</p>
              </td>
            </tr>
            
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


# CUSTOMER ENDPOINTS

@router.post("", response_model=EnquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    enquiry_data: EnquiryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    domain: str = Depends(get_current_domain)
):
    """
    Public endpoint to create an enquiry. 
    Can be for a specific package or a General Enquiry.
    Auth is optional but will link customer_id if logged in.
    """
    agent_id = None
    package_title = "General Enquiry"
    
    # 1. Determine Agent and Package Context
    if enquiry_data.package_id:
        result = await db.execute(select(Package).where(Package.id == enquiry_data.package_id))
        package = result.scalar_one_or_none()
        
        if not package:
            raise NotFoundException("Package not found")
            
        if package.booking_type != "ENQUIRY":
            raise BadRequestException("This package does not accept enquiries. Please use instant booking.")
            
        agent_id = package.created_by
        package_title = package.title
    else:
        # General Enquiry - resolve agent from request or domain
        if enquiry_data.agent_id:
            agent_id = enquiry_data.agent_id
        else:
            # Resolve from domain
            from app.models import Agent
            agent_result = await db.execute(select(Agent).where(Agent.domain == domain))
            agent_profile = agent_result.scalar_one_or_none()
            
            # Fallback for localhost/development
            if not agent_profile and (settings.DEBUG or domain == "localhost"):
                stmt = select(Agent).limit(1)
                agent_result = await db.execute(stmt)
                agent_profile = agent_result.scalar_one_or_none()

            if not agent_profile:
                raise BadRequestException("Could not determine agent for this enquiry. Please specify agent_id or use a valid domain.")
            agent_id = agent_profile.user_id

    # 2. Create Enquiry
    create_data = enquiry_data.model_dump()
    create_data.pop('agent_id', None) # Handle explicitly

    new_enquiry = Enquiry(
        **create_data,
        package_name_snapshot=package_title,
        agent_id=agent_id,
        customer_id=current_user.id if current_user else None,
        status=EnquiryStatus.NEW,
        source="WEB",
        agent_notified=True,
        notification_count=1
    )
    
    db.add(new_enquiry)
    await db.commit()
    await db.refresh(new_enquiry)
    
    # 3. Fire In-App Notification (non-blocking)
    try:
        await NotificationService.notify_new_enquiry(
            db=db,
            agent_id=agent_id,
            customer_name=enquiry_data.customer_name,
            package_title=package_title,
            travel_date=str(enquiry_data.travel_date),
            travellers=enquiry_data.travellers
        )
        logger.info(f"In-app notification created for agent {agent_id}")
    except Exception as e:
        logger.error(f"Failed to create in-app notification for enquiry {new_enquiry.id}: {e}")

    # 4. Send Email Notification to Agent (via Celery - async, non-blocking)
    try:
        # Fetch agent's email address
        agent_user_result = await db.execute(
            select(User).where(User.id == agent_id)
        )
        agent_user = agent_user_result.scalar_one_or_none()
        
        # Fetch agent profile (for SMTP settings and name)
        agent_profile_result = await db.execute(
            select(Agent).where(Agent.user_id == agent_id)
        )
        agent_profile = agent_profile_result.scalar_one_or_none()
        
        if agent_user and agent_user.email:
            agent_name = f"{agent_profile.first_name} {agent_profile.last_name}" if agent_profile else "Agent"
            smtp_config = None
            
            # Use agent's custom SMTP if configured
            if agent_profile and agent_profile.smtp_host and agent_profile.smtp_user:
                smtp_config = {
                    "host": agent_profile.smtp_host,
                    "port": agent_profile.smtp_port or 587,
                    "user": agent_profile.smtp_user,
                    "password": agent_profile.smtp_password or "",
                    "from_email": agent_profile.smtp_from_email or agent_user.email,
                    "from_name": agent_profile.agency_name or "TourSaaS Enquiries",
                    "encryption_type": "tls"
                }
            
            # Build HTML body
            html_body = _build_enquiry_email_html(
                agent_name=agent_name,
                customer_name=enquiry_data.customer_name,
                package_title=package_title,
                travel_date=enquiry_data.travel_date,
                travellers=enquiry_data.travellers,
                email=enquiry_data.email,
                phone=enquiry_data.phone,
                message=enquiry_data.message,
                enquiry_id=str(new_enquiry.id)
            )
            
            # Dispatch async email task via Celery
            from app.tasks.email_tasks import send_email_task
            send_email_task.delay(
                to_email=agent_user.email,
                subject=f"🔔 New Enquiry: {package_title} from {enquiry_data.customer_name}",
                html_body=html_body,
                smtp_config=smtp_config
            )
            logger.info(f"Email notification queued for agent {agent_user.email}")
        else:
            logger.warning(f"No agent email found for agent {agent_id}, skipping email notification.")
    except Exception as e:
        logger.error(f"Failed to queue email notification for enquiry {new_enquiry.id}: {e}")
    
    return new_enquiry




# AGENT ENDPOINTS

@router.get("/agent/list", response_model=EnquiryListResponse)
async def list_agent_enquiries(
    status: Optional[EnquiryStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'view'))
):
    """List enquiries for the authenticated agent or sub-user"""
    query = select(Enquiry).where(Enquiry.agent_id == current_user.agent_id)
    
    if status:
        query = query.where(Enquiry.status == status)
        
    # Count total
    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar()
    
    # Pagination & Ordering
    query = query.order_by(Enquiry.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Include booking info and quotes
    query = query.options(selectinload(Enquiry.booking), selectinload(Enquiry.quotes))
    
    result = await db.execute(query)
    enquiries = result.scalars().all()
    
    # Populate quotes_count
    for e in enquiries:
        e.quotes_count = len(e.quotes)
    
    return EnquiryListResponse(
        enquiries=enquiries,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/agent/{enquiry_id}", response_model=EnquiryResponse)
async def get_enquiry_detail(
    enquiry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'view'))
):
    """Get detailed enquiry information"""
    result = await db.execute(
        select(Enquiry)
        .where(Enquiry.id == enquiry_id)
        .options(selectinload(Enquiry.booking), selectinload(Enquiry.quotes))
    )
    enquiry = result.scalar_one_or_none()
    
    if not enquiry:
        raise NotFoundException("Enquiry not found")
        
    # Security Check
    if enquiry.agent_id != current_user.agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this enquiry")
        
    # Populate quotes_count
    enquiry.quotes_count = len(enquiry.quotes)
        
    return enquiry

@router.put("/agent/{enquiry_id}", response_model=EnquiryResponse)
async def update_enquiry(
    enquiry_id: UUID,
    enquiry_update: EnquiryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'edit'))
):
    """Update enquiry status or agent notes"""
    result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    
    if not enquiry:
        raise NotFoundException("Enquiry not found")
        
    if enquiry.agent_id != current_user.agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this enquiry")
        
    # Strict Status Transition Rules
    if enquiry_update.status and enquiry_update.status != enquiry.status:
        # Cannot move away from terminal states
        if enquiry.status in [EnquiryStatus.CONFIRMED, EnquiryStatus.REJECTED]:
            raise BadRequestException(f"Cannot change status from {enquiry.status}")
            
        # Allowed transitions
        valid = False
        if enquiry.status == EnquiryStatus.NEW and enquiry_update.status == EnquiryStatus.CONTACTED:
            valid = True
        elif enquiry.status in [EnquiryStatus.NEW, EnquiryStatus.CONTACTED] and enquiry_update.status in [EnquiryStatus.CONFIRMED, EnquiryStatus.REJECTED]:
            valid = True
            
        if not valid and enquiry.status != enquiry_update.status:
            raise BadRequestException(f"Invalid status transition from {enquiry.status} to {enquiry_update.status}")
            
        enquiry.status = enquiry_update.status
        if enquiry_update.status == EnquiryStatus.CONTACTED:
            enquiry.last_contacted_at = datetime.now()

    if enquiry_update.agent_notes is not None:
        enquiry.agent_notes = enquiry_update.agent_notes
        
    await db.commit()
    await db.refresh(enquiry)
    return enquiry

@router.post("/agent/{enquiry_id}/convert-to-booking", response_model=EnquiryConversionResponse)
async def convert_enquiry_to_booking(
    enquiry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'full'))
):
    """Convert a confirmed enquiry into a booking"""
    # 1. Fetch Enquiry and related info
    result = await db.execute(
        select(Enquiry)
        .where(Enquiry.id == enquiry_id)
        .options(selectinload(Enquiry.package), selectinload(Enquiry.booking))
    )
    enquiry = result.scalar_one_or_none()
    
    if not enquiry:
        raise NotFoundException("Enquiry not found")
        
    if enquiry.agent_id != current_user.agent_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if enquiry.status != EnquiryStatus.CONFIRMED:
        raise BadRequestException("Only confirmed enquiries can be converted to bookings")
        
    if enquiry.booking:
        raise BadRequestException("This enquiry has already been converted to a booking")

    package = enquiry.package
    if not package:
        raise BadRequestException("The package associated with this enquiry has been deleted.")

    # 2. Prepare Booking Data
    booking_reference = generate_booking_reference()
    
    # Calculate amount (fallback to 0 if package has no price)
    price_per_person = float(package.price_per_person) if package.price_per_person else 0.0
    total_amount = price_per_person * enquiry.travellers
    
    # Identify the user to link the booking to
    target_user_id = enquiry.customer_id
    if not target_user_id:
        # Try to find a user by email
        user_result = await db.execute(select(User).where(User.email == enquiry.email))
        existing_user = user_result.scalar_one_or_none()
        if existing_user:
            target_user_id = existing_user.id

    # Create Booking
    # Status depends on enquiry_payment type
    booking_status = BookingStatus.PENDING
    if package.enquiry_payment == EnquiryPaymentType.PAYMENT_LINK:
        booking_status = BookingStatus.INITIATED

    new_booking = Booking(
        booking_reference=booking_reference,
        package_id=package.id,
        user_id=target_user_id, # Link to customer if they have account
        agent_id=enquiry.agent_id,
        booking_date=date.today(),
        travel_date=enquiry.travel_date,
        number_of_travelers=enquiry.travellers,
        total_amount=total_amount,
        status=booking_status,
        payment_status=PaymentStatus.PENDING,
        enquiry_id=enquiry.id,
        special_requests=f"Created from enquiry: {enquiry.id}. Message: {enquiry.message}"
    )
    
    db.add(new_booking)
    await db.flush() # Get booking ID
    
    payment_link = None
    
    # 3. Handle Payment Link Generation
    if package.enquiry_payment == EnquiryPaymentType.PAYMENT_LINK:
        # Load agent razorpay settings
        from app.models import Agent
        from app.models import AgentRazorpaySettings
        
        agent_result = await db.execute(
            select(Agent)
            .where(Agent.user_id == enquiry.agent_id)
            .options(selectinload(Agent.razorpay_settings))
        )
        agent = agent_result.scalar_one_or_none()
        
        key_id = settings.RAZORPAY_BOOKING_KEY_ID
        key_secret = settings.RAZORPAY_BOOKING_KEY_SECRET
        
        if agent and agent.razorpay_settings:
            key_id = agent.razorpay_settings.key_id
            key_secret = decrypt_value(agent.razorpay_settings.key_secret)
            
        client = razorpay.Client(auth=(key_id, key_secret))
        
        try:
            # Generate Link
            amount_in_paise = int(total_amount * 100)
            
            # Simple link creation (can be enhanced with more details)
            link_data = {
                "amount": amount_in_paise,
                "currency": "INR",
                "accept_partial": False,
                "first_min_partial_amount": 0,
                "description": f"Booking for {package.title} - Ref: {booking_reference}",
                "customer": {
                    "name": enquiry.customer_name,
                    "email": enquiry.email,
                    "contact": enquiry.phone
                },
                "notify": {
                    "sms": True,
                    "email": True
                },
                "reminder_enable": True,
                "notes": {
                    "booking_id": str(new_booking.id),
                    "enquiry_id": str(enquiry.id)
                },
                "callback_url": f"{settings.FRONTEND_URL}/bookings/{new_booking.id}",
                "callback_method": "get"
            }
            
            # Mock check
            if "1234567890" in key_id:
                payment_link = f"https://rzp.io/i/mock_link_{booking_reference}"
            else:
                response = client.payment_link.create(link_data)
                payment_link = response.get("short_url")
                
        except Exception as e:
            print(f"Failed to generate payment link: {str(e)}")
            # Fail gracefully, still create booking but message will indicate link failure
            
    await db.commit()
    await db.refresh(new_booking)
    
    return EnquiryConversionResponse(
        booking=new_booking,
        payment_link=payment_link,
        message="Enquiry converted to booking successfully" if not payment_link and package.enquiry_payment == EnquiryPaymentType.PAYMENT_LINK else "Booking created and payment link generated" if payment_link else "Booking created manually"
    )


# AI & QUOTE BUILDER ENDPOINTS

@router.post("/agent/{enquiry_id}/analyze", response_model=EnquiryAnalyzeResponse)
async def analyze_enquiry_with_ai(
    enquiry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'edit'))
):
    """Analyze the enquiry message using AI to extract travel parameters"""
    result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    
    if not enquiry:
        raise NotFoundException("Enquiry not found")
        
    if enquiry.agent_id != current_user.agent_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not enquiry.message and not enquiry.package_name_snapshot:
        return EnquiryAnalyzeResponse()
        
    # Provide more context to Gemini for better extraction
    context_msg = f"Message: {enquiry.message or 'No message'}\n"
    if enquiry.package_name_snapshot:
        context_msg += f"Interesting Package: {enquiry.package_name_snapshot}\n"
    if enquiry.travel_date:
        context_msg += f"Travel Date: {enquiry.travel_date.isoformat()}\n"
    context_msg += f"Travellers: {enquiry.travellers}\n"

    analysis_result = await gemini_service.analyze_enquiry(context_msg)
    if not analysis_result.get("success"):
        return EnquiryAnalyzeResponse(
            internal_error=analysis_result.get("error", "Unknown extraction error")
        )
        
    data = analysis_result.get("data", {})
    return EnquiryAnalyzeResponse(**data)


@router.post("/agent/{enquiry_id}/generate-quote", response_model=EnquiryQuoteResponse)
async def generate_enquiry_quote(
    enquiry_id: UUID,
    quote_data: EnquiryQuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'edit'))
):
    """Generate a PDF quote and store it in history"""
    # 1. Fetch Enquiry and Agent Profile
    enquiry_result = await db.execute(
        select(Enquiry)
        .where(Enquiry.id == enquiry_id)
        .options(selectinload(Enquiry.quotes))
    )
    enquiry = enquiry_result.scalar_one_or_none()
    
    if not enquiry:
        raise NotFoundException("Enquiry not found")
        
    agent_result = await db.execute(
        select(Agent)
        .where(Agent.user_id == enquiry.agent_id)
        .options(selectinload(Agent.user))
    )
    agent_profile = agent_result.scalar_one_or_none()

    # 2. Fetch Selected Packages
    pkg_ids = [str(p.packageId) for p in quote_data.packages]
    packages_result = await db.execute(
        select(Package)
        .where(Package.id.in_(pkg_ids))
        .options(selectinload(Package.itinerary_items))
    )
    packages = packages_result.scalars().all()
    
    if not packages:
        raise BadRequestException("No valid packages selected for quote")

    # 3. Generate PDF
    quoted_packages_json = [p.model_dump() for p in quote_data.packages]
    for sp in quoted_packages_json:
        sp['packageId'] = str(sp['packageId'])
        sp['quotedPrice'] = float(sp['quotedPrice'])

    pdf_url = await pdf_service.generate_quote_pdf(
        enquiry=enquiry,
        packages=packages,
        agent_profile=agent_profile,
        quoted_data=quoted_packages_json
    )

    # 4. Save Quote History
    new_quote = EnquiryQuote(
        enquiry_id=enquiry.id,
        quoted_packages=quoted_packages_json,
        pdf_url=pdf_url,
        email_sent_to=enquiry.email,
        ai_extracted_data=quote_data.aiExtractedData
    )
    
    db.add(new_quote)
    await db.commit()
    await db.refresh(new_quote)
    
    return new_quote


@router.post("/agent/{enquiry_id}/send-quote/{quote_id}")
async def send_enquiry_quote_email(
    enquiry_id: UUID,
    quote_id: UUID,
    email_subject: str = Query(..., min_length=1),
    email_body: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'edit'))
):
    """Send the generated PDF quote to the customer via email"""
    # 1. Fetch Quote and Enquiry
    quote_result = await db.execute(
        select(EnquiryQuote).where(EnquiryQuote.id == quote_id)
    )
    quote = quote_result.scalar_one_or_none()
    
    if not quote or quote.enquiry_id != enquiry_id:
        raise NotFoundException("Quote not found")
        
    enquiry_result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = enquiry_result.scalar_one_or_none()

    # 2. Fetch Agent SMTP settings
    agent_profile_result = await db.execute(
        select(Agent).where(Agent.user_id == enquiry.agent_id)
    )
    agent_profile = agent_profile_result.scalar_one_or_none()
    
    smtp_config = None
    if agent_profile and agent_profile.smtp_host and agent_profile.smtp_user:
        smtp_config = {
            "host": agent_profile.smtp_host,
            "port": agent_profile.smtp_port or 587,
            "user": agent_profile.smtp_user,
            "password": agent_profile.smtp_password or "",
            "from_email": agent_profile.smtp_from_email or current_user.email,
            "from_name": agent_profile.agency_name or "Travel Agency",
            "encryption_type": "tls"
        }

    # 3. Dispatch Email Task with Attachment
    from app.tasks.email_tasks import send_email_task
    # Resolve absolute path for the PDF
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", quote.pdf_url.lstrip('/'))
    
    send_email_task.delay(
        to_email=enquiry.email,
        subject=email_subject,
        html_body=email_body,
        smtp_config=smtp_config,
        attachments=[{
            "filename": os.path.basename(pdf_path),
            "file_path": pdf_path,
            "content_type": "application/pdf"
        }]
    )
    
    # 4. Update Enquiry Status to CONTACTED if it was NEW
    if enquiry.status == EnquiryStatus.NEW:
        enquiry.status = EnquiryStatus.CONTACTED
        enquiry.last_contacted_at = datetime.now()
        await db.commit()

    return {"success": True, "message": "Quote sent successfully"}


@router.get("/agent/{enquiry_id}/history", response_model=EnquiryQuoteHistoryResponse)
async def get_enquiry_quote_history(
    enquiry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission('enquiries', 'view'))
):
    """Retrieve the history of quotes sent for this enquiry"""
    result = await db.execute(
        select(EnquiryQuote)
        .where(EnquiryQuote.enquiry_id == enquiry_id)
        .order_by(EnquiryQuote.quote_sent_at.desc())
    )
    quotes = result.scalars().all()
    
    return EnquiryQuoteHistoryResponse(quotes=quotes)
