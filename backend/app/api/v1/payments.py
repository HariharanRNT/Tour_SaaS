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
    PaymentVerification, PaymentResponse, MessageResponse
)
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.config import settings

router = APIRouter()

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_BOOKING_KEY_ID, settings.RAZORPAY_BOOKING_KEY_SECRET))


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_payment_order(
    payment_data: PaymentOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create Razorpay order for booking"""
    # Get booking
    result = await db.execute(select(Booking).where(Booking.id == payment_data.booking_id))
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise NotFoundException("Booking not found")
    
    # Check if user owns this booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")
    
    # Check if booking is already paid
    if booking.payment_status == PaymentStatus.SUCCEEDED:
        raise BadRequestException("Booking is already paid")
    
    # Create Razorpay order
    amount_in_paise = int(booking.total_amount * 100)
    
    try:
        # Check for dummy keys to mock response
        # Similar logic to subscriptions: force mock if key looks like default dummy
        use_mock = "1234567890" in settings.RAZORPAY_BOOKING_KEY_ID or "mock" in settings.RAZORPAY_BOOKING_KEY_ID.lower()
        
        if use_mock:
            raise Exception("Force Mock")

        order = razorpay_client.order.create({
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
        amount=booking.total_amount,
        currency="INR",
        status=PaymentStatus.PENDING
    )
    
    db.add(payment)
    await db.commit()
    
    return PaymentOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=settings.RAZORPAY_BOOKING_KEY_ID
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
    try:
        # Skip verification for dummy keys
        if "1234567890" in settings.RAZORPAY_BOOKING_KEY_ID:
            pass
        else:
            params_dict = {
                'razorpay_order_id': verification_data.razorpay_order_id,
                'razorpay_payment_id': verification_data.razorpay_payment_id,
                'razorpay_signature': verification_data.razorpay_signature
            }
            razorpay_client.utility.verify_payment_signature(params_dict)
    except razorpay.errors.SignatureVerificationError:
        # Update payment status to failed
        payment.status = PaymentStatus.FAILED
        await db.commit()
        raise BadRequestException("Invalid payment signature")
    
    # Update payment status
    payment.razorpay_payment_id = verification_data.razorpay_payment_id
    payment.razorpay_signature = verification_data.razorpay_signature
    payment.status = PaymentStatus.SUCCEEDED
    
    # Update booking status
    result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
    booking = result.scalar_one_or_none()
    
    if booking:
        booking.payment_status = PaymentStatus.SUCCEEDED
        booking.status = BookingStatus.CONFIRMED
    
    await db.commit()
    
    return MessageResponse(
        message="Payment verified successfully",
        detail=f"Booking {booking.booking_reference} confirmed"
    )


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
