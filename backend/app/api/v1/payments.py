from app.core.cache import invalidate_namespace
"""Payment API routes with Razorpay integration"""
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import razorpay
from app.database import get_db
from app.models import Payment, Booking, PaymentStatus, BookingStatus
from app.schemas import (
    PaymentOrderCreate, PaymentOrderResponse,
    PaymentVerification, PaymentFailedRequest, PaymentResponse, MessageResponse
)
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.config import settings
from app.models import Agent, AgentRazorpaySettings, User
from app.utils.crypto import decrypt_value
from sqlalchemy.orm import selectinload

router = APIRouter()

# Initialize Razorpay client
# Initialize Razorpay client (Default/Fallback)
# We will instantiate per-request for dynamic credentials
default_razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_BOOKING_KEY_ID, settings.RAZORPAY_BOOKING_KEY_SECRET))


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_payment_order(
    payment_data: PaymentOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create Razorpay order for booking"""
    # Get booking
    # Load agent settings
    result = await db.execute(
        select(Booking)
        .where(Booking.id == payment_data.booking_id)
        .options(
            selectinload(Booking.agent).selectinload(User.agent_profile).selectinload(Agent.razorpay_settings)
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise NotFoundException("Booking not found")
    
    # Check if user owns this booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")
    
    # Check if booking is already paid
    if booking.payment_status in [PaymentStatus.SUCCEEDED, PaymentStatus.PAID]:
        raise BadRequestException("Booking is already paid")
    
    # Create Razorpay order
    if booking.is_split_payment and booking.advance_amount is not None:
        if booking.advance_payment_status == 'PAID':
            charge_amount = booking.final_amount
        else:
            charge_amount = booking.advance_amount
    else:
        charge_amount = booking.total_amount
        
    amount_in_paise = int(charge_amount * 100)
    
    # Determine Credentials
    key_id = settings.RAZORPAY_BOOKING_KEY_ID
    key_secret = settings.RAZORPAY_BOOKING_KEY_SECRET
    
    if booking.agent_id:
        # Check if agent has custom settings
        agent = booking.agent
        if agent and agent.agent_profile and agent.agent_profile.razorpay_settings:
            rp = agent.agent_profile.razorpay_settings
            key_id = rp.key_id
            key_secret = decrypt_value(rp.key_secret)
            
    client = razorpay.Client(auth=(key_id, key_secret))

    try:
        # Check for dummy keys to mock response
        # Similar logic to subscriptions: force mock if key looks like default dummy
        use_mock = "1234567890" in key_id or "mock" in key_id.lower()
        
        if use_mock:
            raise Exception("Force Mock")

        order = client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": booking.booking_reference,
            "payment_capture": 1,
            "notes": {
                 "booking_id": str(booking.id),
                 "user_id": str(current_user.id)
            }
        })
    except Exception as e:
        print(f"Payment Order Creation Failed (falling back to mock if dev): {str(e)}")
        
        # In production, do not silent fallback. Raise error.
        if settings.APP_ENV == "production" and "Force Mock" not in str(e):
             raise HTTPException(status_code=500, detail=f"Payment Gateway Error: {str(e)}")

        import uuid
        order = {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": amount_in_paise,
            "currency": "INR",
            "status": "created"
        }
    
    # Save payment record
    payment = Payment(
        booking_id=booking.id,
        razorpay_order_id=order["id"],
        amount=charge_amount,
        currency="INR",
        status=PaymentStatus.PENDING
    )
    
    db.add(payment)
    await db.commit()
    
    return PaymentOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=key_id
    )


@router.post("/verify", response_model=MessageResponse)
async def verify_payment(
    verification_data: PaymentVerification,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Verify Razorpay payment signature"""
    # Get payment by order ID
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == verification_data.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise NotFoundException("Payment not found")
    
    # Verify signature
    # Verify signature
    # Fetch booking to determine agent credentials
    # We need to reload booking with agent settings
    result_booking = await db.execute(
        select(Booking)
        .where(Booking.id == payment.booking_id)
        .options(
            selectinload(Booking.agent).selectinload(User.agent_profile).selectinload(Agent.razorpay_settings)
        )
    )
    booking = result_booking.scalar_one_or_none()
    
    # Determine Credentials
    key_id = settings.RAZORPAY_BOOKING_KEY_ID
    key_secret = settings.RAZORPAY_BOOKING_KEY_SECRET
    
    if booking and booking.agent_id:
        agent = booking.agent
        if agent and agent.agent_profile and agent.agent_profile.razorpay_settings:
            rp = agent.agent_profile.razorpay_settings
            key_id = rp.key_id
            key_secret = decrypt_value(rp.key_secret)
            
    client = razorpay.Client(auth=(key_id, key_secret))

    try:
        # Skip verification for dummy keys
        if "1234567890" in key_id:
            pass
        else:
            params_dict = {
                'razorpay_order_id': verification_data.razorpay_order_id,
                'razorpay_payment_id': verification_data.razorpay_payment_id,
                'razorpay_signature': verification_data.razorpay_signature
            }
            client.utility.verify_payment_signature(params_dict)
    except razorpay.errors.SignatureVerificationError:
        # Update payment status to failed
        payment.status = PaymentStatus.FAILED
        if booking:
            booking.payment_status = PaymentStatus.FAILED
            booking.status = BookingStatus.CANCELLED
        await db.commit()
        raise BadRequestException("Invalid payment signature")
    
    # Update payment status — commit immediately so payment is recorded even if orchestration below fails
    import logging
    logger = logging.getLogger(__name__)

    payment.razorpay_payment_id = verification_data.razorpay_payment_id
    payment.razorpay_signature = verification_data.razorpay_signature
    payment.status = PaymentStatus.PAID
    
    if booking:
        if booking.is_split_payment:
            if booking.advance_payment_status != 'PAID':
                booking.advance_payment_status = 'PAID'
                booking.payment_status = PaymentStatus.PENDING
                # Also update the advance BookingPayment record
                from app.models import BookingPayment
                bp_stmt = select(BookingPayment).where(
                    BookingPayment.booking_id == booking.id,
                    BookingPayment.payment_type == 'ADVANCE'
                )
                bp_res = await db.execute(bp_stmt)
                adv_bp = bp_res.scalar_one_or_none()
                if adv_bp:
                    adv_bp.payment_status = 'PAID'
                    adv_bp.razorpay_payment_id = verification_data.razorpay_payment_id
                    from datetime import datetime
                    import pytz
                    adv_bp.payment_date = datetime.now(pytz.UTC)
            else:
                booking.final_payment_status = 'PAID'
                booking.payment_status = PaymentStatus.PAID
                # Also update the final BookingPayment record
                from app.models import BookingPayment
                bp_stmt = select(BookingPayment).where(
                    BookingPayment.booking_id == booking.id,
                    BookingPayment.payment_type == 'FINAL'
                )
                bp_res = await db.execute(bp_stmt)
                final_bp = bp_res.scalar_one_or_none()
                if final_bp:
                    final_bp.payment_status = 'PAID'
                    final_bp.razorpay_payment_id = verification_data.razorpay_payment_id
                    from datetime import datetime
                    import pytz
                    final_bp.payment_date = datetime.now(pytz.UTC)
        else:
            booking.payment_status = PaymentStatus.PAID
            
        booking.status = BookingStatus.CONFIRMED  # Mark confirmed immediately - payment is verified
    
    # Commit the payment + status change BEFORE orchestration so
    # a downstream error (email, flight, notification) never rolls this back.
    await db.commit()
    
    # 4. Process Post-Confirmation Steps via Orchestrator (emails, flight booking, notifications)
    # NOTE: The booking is ALREADY CONFIRMED above. Orchestration failures must NOT cancel it.
    from app.services.booking_orchestrator import BookingOrchestrator
    from app.services.tripjack_adapter import TripJackAdapter
    
    tripjack = TripJackAdapter(
        api_key=settings.TRIPJACK_API_KEY, 
        base_url=settings.TRIPJACK_BASE_URL
    )
    orchestrator = BookingOrchestrator(db, tripjack)
    
    try:
        payment_data_dict = {
            "razorpay_order_id": verification_data.razorpay_order_id,
            "razorpay_payment_id": verification_data.razorpay_payment_id,
            "razorpay_signature": verification_data.razorpay_signature
        }
        
        # Orchestrator will fetch travelers from DB via finalize_booking
        confirmed_booking = await orchestrator.process_checkout(
            booking_id=booking.id,
            payment_verification=payment_data_dict,
            traveler_info=[]  # Orchestrator fetches from DB in finalize_booking
        )
        
        from fastapi_cache import FastAPICache
        await invalidate_namespace("dashboard")
        
        return MessageResponse(
            message="Payment verified successfully",
            detail=f"Booking {confirmed_booking.booking_reference} confirmed"
        )
        
    except Exception as e:
        # Orchestration (emails/notifications/flight) failed — but payment is already captured
        # and booking is already CONFIRMED. Do NOT cancel the booking.
        logger.error(f"Post-payment orchestration failed for booking {booking.id}: {e}")
        
        # Return success because the booking IS confirmed and payment IS captured.
        # The orchestration failure (e.g., email delivery) should not surface as an error to the customer.
        return MessageResponse(
            message="Payment verified successfully",
            detail=f"Booking confirmed. Ref: {booking.booking_reference}"
        )


from pydantic import BaseModel
class PaymentLinkVerification(BaseModel):
    razorpay_payment_id: str
    razorpay_payment_link_id: str
    razorpay_payment_link_reference_id: str
    razorpay_payment_link_status: str
    razorpay_signature: str

@router.post("/verify-link", response_model=MessageResponse)
async def verify_payment_link(
    verification_data: PaymentLinkVerification,
    db: AsyncSession = Depends(get_db)
):
    """Verify Razorpay payment link signature and update status synchronously"""
    from app.models import BookingPayment, Booking
    
    # 1. Find the FINAL BookingPayment by link ID
    stmt = (
        select(BookingPayment)
        .where(
            BookingPayment.razorpay_link_id == verification_data.razorpay_payment_link_id,
            BookingPayment.payment_type == 'FINAL'
        )
        .options(selectinload(BookingPayment.booking))
    )
    result = await db.execute(stmt)
    final_bp = result.scalar_one_or_none()
    
    if not final_bp:
        raise NotFoundException("Payment link not found in system")
        
    booking = final_bp.booking
    if not booking:
        raise NotFoundException("Booking not found")

    # Determine Credentials
    key_id = settings.RAZORPAY_BOOKING_KEY_ID
    key_secret = settings.RAZORPAY_BOOKING_KEY_SECRET
    
    # Load agent settings
    result_agent = await db.execute(
        select(Booking)
        .where(Booking.id == booking.id)
        .options(
            selectinload(Booking.agent).selectinload(User.agent_profile).selectinload(Agent.razorpay_settings)
        )
    )
    booking_agent = result_agent.scalar_one_or_none()
    
    if booking_agent and booking_agent.agent_id:
        agent = booking_agent.agent
        if agent and agent.agent_profile and agent.agent_profile.razorpay_settings:
            rp = agent.agent_profile.razorpay_settings
            key_id = rp.key_id
            key_secret = decrypt_value(rp.key_secret)
            
    client = razorpay.Client(auth=(key_id, key_secret))

    # Verify signature
    try:
        # Skip verification for dummy keys
        if "1234567890" not in key_id:
            params_dict = {
                'razorpay_payment_id': verification_data.razorpay_payment_id,
                'payment_link_id': verification_data.razorpay_payment_link_id,
                'payment_link_reference_id': verification_data.razorpay_payment_link_reference_id,
                'payment_link_status': verification_data.razorpay_payment_link_status,
                'razorpay_signature': verification_data.razorpay_signature
            }
            client.utility.verify_payment_link_signature(params_dict)
    except razorpay.errors.SignatureVerificationError:
        raise BadRequestException("Invalid payment signature")
        
    # Idempotency: if already paid, just return success
    if booking.final_payment_status == 'PAID':
        return MessageResponse(message="Payment already verified")

    # Update Statuses
    from datetime import datetime as _dt
    import pytz
    final_bp.payment_status = 'PAID'
    final_bp.payment_date = _dt.now(pytz.UTC)
    final_bp.razorpay_payment_id = verification_data.razorpay_payment_id
    
    booking.final_payment_status = 'PAID'
    booking.payment_status = PaymentStatus.PAID
    
    await db.commit()
    
    # Clear Dashboard cache so agent sees it instantly
    from fastapi_cache import FastAPICache
    try:
        await invalidate_namespace("dashboard")
    except:
        pass
        
    # Trigger confirmation emails (non-blocking)
    import asyncio
    try:
        from app.services.customer_notification_service import CustomerNotificationService
        # re-fetch booking with full relations
        stmt_full = select(Booking).where(Booking.id == booking.id).options(
            selectinload(Booking.user),
            selectinload(Booking.agent),
            selectinload(Booking.package)
        )
        res_full = await db.execute(stmt_full)
        booking_full = res_full.scalar_one_or_none()
        
        asyncio.create_task(CustomerNotificationService.send_final_payment_confirmation(booking_full))
        asyncio.create_task(CustomerNotificationService.send_agent_final_payment_notification(booking_full))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to send link payment confirmation email: {e}")

    return MessageResponse(
        message="Payment link verified successfully",
        detail=f"Booking {booking.booking_reference} final payment confirmed"
    )


@router.post("/payment-failed", response_model=MessageResponse)
async def mark_payment_failed(
    data: PaymentFailedRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark a booking payment as failed (e.g. on modal dismissal)"""
    result = await db.execute(
        select(Booking).where(Booking.id == data.booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise NotFoundException("Booking not found")
        
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Update Statuses
    booking.payment_status = PaymentStatus.FAILED
    booking.status = BookingStatus.CANCELLED
    
    # Also update associated Payment records if any
    result_payments = await db.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    )
    payments = result_payments.scalars().all()
    for p in payments:
        if p.status == PaymentStatus.PENDING:
            p.status = PaymentStatus.FAILED
            
    await db.commit()
    
    return MessageResponse(message="Payment marked as failed")


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get payment details"""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise NotFoundException("Payment not found")
    
    # Check if user owns this payment's booking
    result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
    booking = result.scalar_one_or_none()
    
    if booking and booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    return PaymentResponse.model_validate(payment)
