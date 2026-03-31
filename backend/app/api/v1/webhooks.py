from fastapi import APIRouter, Request, HTTPException, Depends, Header
from app.config import settings
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import func
from datetime import timedelta
from app.services.subscription_service import SubscriptionService
from app.models import BookingRefund, Booking, WebhookEvent, Settlement, PaymentStatus, Subscription, Invoice
import razorpay
import hmac
import hashlib
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Razorpay Webhooks (Subscription, Refund events)
    """
    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing Signature")

    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8')
    
    logger.info(f"Webhook Received: {body_str[:100]}...")

    # Verify Signature
    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))
        client.utility.verify_webhook_signature(body_str, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET)
    except Exception as e:
        logger.warning(f"Webhook Signature Verification Failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid Signature")

    webhook_event = None
    try:
        event = json.loads(body_str)
        event_id = event.get('id')
        event_type = event.get('event')
        
        # 1. IDEMPOTENCY CHECK (Create event record first)
        if event_id:
            existing_stmt = select(WebhookEvent).where(WebhookEvent.razorpay_event_id == event_id)
            existing_res = await db.execute(existing_stmt)
            if existing_res.scalar_one_or_none():
                logger.info(f"[Webhook] Event {event_id} already exists. Skipping.")
                return {"status": "ok"}

            webhook_event = WebhookEvent(
                razorpay_event_id=event_id,
                event_type=event_type,
                payload=event,
                status="processing"
            )
            db.add(webhook_event)
            await db.commit()
            await db.refresh(webhook_event)

        logger.info(f"[Webhook] Processing {event_type} - ID: {event_id}")

        # 2. DISPATCH TO HANDLERS
        # Subscription Events
        if event_type == 'subscription.charged':
            await SubscriptionService.handle_subscription_charged(event['payload'], db)
        elif event_type == 'subscription.halted':
            await _handle_subscription_halted(event['payload'], db)
        elif event_type == 'subscription.pending':
            await _handle_subscription_pending(event['payload'], db)
        
        # Invoice Events
        elif event_type == 'invoice.payment_failed':
            await _handle_invoice_payment_failed(event['payload'], db)

        # Refund Events
        elif event_type == 'refund.created':
            await _handle_refund_created(event['payload'], db)
        elif event_type == 'refund.processed':
            await _handle_refund_processed(event['payload'], db)
        elif event_type == 'refund.failed':
            await _handle_refund_failed(event['payload'], db)
        elif event_type == 'refund.speed_changed':
            await _handle_refund_speed_changed(event['payload'], db)
            
        # Settlement Events
        elif event_type == 'settlement.processed':
            await _handle_settlement_processed(event['payload'], db)
            
        # Payment/Order Events (New)
        elif event_type in ['payment.captured', 'order.paid']:
            await _handle_payment_captured(event['payload'], db)
        if webhook_event:
            webhook_event.status = "processed"
            await db.commit()
            
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"[Webhook] Processing Error: {e}", exc_info=True)
        if webhook_event:
            webhook_event.status = "failed"
            await db.commit()
        return {"status": "ok"}


async def _handle_refund_processed(payload: dict, db: AsyncSession):
    """
    Handle refund.processed: update BookingRefund.status → 'succeeded'
    and send the customer a definitive 'Refund Confirmed' email.
    """
    refund_obj = payload.get("refund", {}).get("entity", {})
    razorpay_refund_id = refund_obj.get("id")
    razorpay_payment_id = refund_obj.get("payment_id")
    amount_paise = refund_obj.get("amount", 0)
    refund_amount = amount_paise / 100  # Convert paise → rupees

    # 1. Find Refund Record (Reliable lookup)
    refund_record = None
    if razorpay_refund_id:
        stmt = select(BookingRefund).where(BookingRefund.razorpay_refund_id == razorpay_refund_id)
        res = await db.execute(stmt)
        refund_record = res.scalar_one_or_none()

    # Fallback to payment_id ONLY if refund_id was missing in results but present in payload
    if not refund_record and razorpay_payment_id:
        # Check if this payload was missing a refund id (sometimes true for older integrations or specific events)
        # But here we prefer being safe.
        stmt = select(BookingRefund).where(BookingRefund.razorpay_payment_id == razorpay_payment_id)
        res = await db.execute(stmt)
        refund_record = res.scalar_one_or_none()

    if not refund_record:
        logger.warning(f"[Refund Success] Mapping failed for refund_id={razorpay_refund_id}, payment_id={razorpay_payment_id}")
        return

    # Load relationships for email
    await db.refresh(refund_record, ['booking'])
    if refund_record.booking:
        stmt_booking = select(Booking).where(Booking.id == refund_record.booking_id).options(
            selectinload(Booking.user),
            selectinload(Booking.agent)
        )
        res_booking = await db.execute(stmt_booking)
        refund_record.booking = res_booking.scalar_one_or_none()

    # 2. Update status and send email (Standardized & Idempotent)
    if refund_record.status != "succeeded":
        refund_record.status = "succeeded"
        if razorpay_refund_id:
            refund_record.razorpay_refund_id = razorpay_refund_id
        
        await db.commit()
        await db.refresh(refund_record)
        logger.info(f"[Refund Success] Updated BookingRefund {refund_record.id} -> succeeded. refund_id={razorpay_refund_id}")

        if refund_record.booking:
            try:
                from app.services.customer_notification_service import CustomerNotificationService
                final_amount = float(refund_record.refund_amount) if refund_record.refund_amount else refund_amount
                await CustomerNotificationService.send_refund_confirmed(refund_record.booking, final_amount)
                logger.info(f"[Refund Success] Confirmation email sent for booking {refund_record.booking_id}")
            except Exception as e:
                logger.error(f"[Refund Success] Failed to send email: {e}")
    else:
        logger.info(f"[Refund Success] Already succeeded for refund_id={razorpay_refund_id}. Skipping email.")

async def _handle_refund_created(payload: dict, db: AsyncSession):
    """Mark refund as initiated when created."""
    refund_obj = payload.get("refund", {}).get("entity", {})
    razorpay_refund_id = refund_obj.get("id")
    razorpay_payment_id = refund_obj.get("payment_id")

    stmt = select(BookingRefund).where(
        (BookingRefund.razorpay_refund_id == razorpay_refund_id) |
        (BookingRefund.razorpay_payment_id == razorpay_payment_id)
    )
    result = await db.execute(stmt)
    refund_record = result.scalar_one_or_none()

    if refund_record and refund_record.status == 'pending':
        refund_record.status = "initiated"
        if razorpay_refund_id:
            refund_record.razorpay_refund_id = razorpay_refund_id
        await db.commit()
        logger.info(f"[Refund Created] BookingRefund {refund_record.id} -> initiated")


async def _handle_refund_failed(payload: dict, db: AsyncSession):
    """
    Handle refund.failed: update BookingRefund.status → 'failed' and store reason.
    """
    refund_obj = payload.get("refund", {}).get("entity", {})
    razorpay_refund_id = refund_obj.get("id")
    razorpay_payment_id = refund_obj.get("payment_id")
    failure_reason = refund_obj.get("description", "Refund failed by Razorpay")

    # Lookup matching refund record
    refund_record = None
    if razorpay_refund_id:
        stmt = select(BookingRefund).where(BookingRefund.razorpay_refund_id == razorpay_refund_id)
        res = await db.execute(stmt)
        refund_record = res.scalar_one_or_none()
    
    if not refund_record and razorpay_payment_id:
        stmt = select(BookingRefund).where(BookingRefund.razorpay_payment_id == razorpay_payment_id)
        res = await db.execute(stmt)
        refund_record = res.scalar_one_or_none()

    if not refund_record:
        logger.warning(f"[Refund Failed] Webhook mapping failed for refund_id={razorpay_refund_id}")
        return

    refund_record.status = "failed"
    refund_record.failure_reason = failure_reason
    await db.commit()
    await db.refresh(refund_record)
    logger.info(f"[Refund Failed] BookingRefund {refund_record.id} updated. Reason: {failure_reason}")

async def _handle_subscription_halted(payload: dict, db: AsyncSession):
    sub_obj = payload.get("subscription", {}).get("entity", {})
    sub_id = sub_obj.get("id")
    if not sub_id: return
    
    stmt = select(Subscription).where(Subscription.razorpay_subscription_id == sub_id)
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    if subscription:
        subscription.status = "halted"
        subscription.grace_period_ends_at = func.now() + timedelta(days=7)
        await db.commit()
        logger.info(f"Subscription {sub_id} halted. Grace period set.")

async def _handle_subscription_pending(payload: dict, db: AsyncSession):
    sub_obj = payload.get("subscription", {}).get("entity", {})
    sub_id = sub_obj.get("id")
    if not sub_id: return
    
    stmt = select(Subscription).where(Subscription.razorpay_subscription_id == sub_id)
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    if subscription:
        if subscription.status != "active": # Don't override if already active
            subscription.status = "pending"
            await db.commit()
            logger.info(f"Subscription {sub_id} set to pending.")

async def _handle_invoice_payment_failed(payload: dict, db: AsyncSession):
    invoice_obj = payload.get("invoice", {}).get("entity", {})
    sub_id = invoice_obj.get("subscription_id")
    if sub_id:
        stmt = select(Subscription).where(Subscription.razorpay_subscription_id == sub_id)
        result = await db.execute(stmt)
        subscription = result.scalar_one_or_none()
        if subscription:
            # Set grace period when invoice fails but subscription isn't necessarily halted yet
            subscription.grace_period_ends_at = func.now() + timedelta(days=7)
            await db.commit()
            logger.info(f"Invoice payment failed for subscription {sub_id}. Grace period activated.")

async def _handle_refund_speed_changed(payload: dict, db: AsyncSession):
    refund_obj = payload.get("refund", {}).get("entity", {})
    refund_id = refund_obj.get("id")
    logger.info(f"Refund {refund_id} speed changed. Expect slight delay.")
    
    if not refund_id: return
    stmt = select(BookingRefund).where(BookingRefund.razorpay_refund_id == refund_id).options(selectinload(BookingRefund.booking))
    result = await db.execute(stmt)
    refund_record = result.scalar_one_or_none()
    
    if refund_record and refund_record.booking:
        # We can implement a specific CustomerNotificationService notification if needed.
        logger.info(f"Notified speed change for booking {refund_record.booking_id}")

async def _handle_settlement_processed(payload: dict, db: AsyncSession):
    settle_obj = payload.get("settlement", {}).get("entity", {})
    settlement_id = settle_obj.get("id")
    amount = settle_obj.get("amount", 0) / 100
    utr = settle_obj.get("utr")
    desc = settle_obj.get("description")
    created_at = settle_obj.get("created_at")
    
    if settlement_id:
        from datetime import datetime
        import pytz
        created_dt = datetime.fromtimestamp(created_at, tz=pytz.UTC) if created_at else datetime.now(pytz.UTC)
            
        settlement = Settlement(
            settlement_id=settlement_id,
            amount=amount,
            utr=utr,
            description=desc,
            created_at=created_dt
        )
        db.add(settlement)
        await db.commit()
        logger.info(f"[Settlement] {settlement_id} recorded for {amount} INR. (Accounting only)")

async def _handle_payment_captured(payload: dict, db: AsyncSession):
    """
    Handle payment.captured or order.paid: Confirm the associated booking.
    """
    entity = payload.get("payment", {}).get("entity") or payload.get("order", {}).get("entity")
    if not entity:
        logger.warning("No payment or order entity found in webhook payload")
        return

    payment_id = entity.get("id") if "pay_" in entity.get("id", "") else None
    order_id = entity.get("order_id") or (entity.get("id") if "order_" in entity.get("id", "") else None)
    notes = entity.get("notes", {})
    booking_id_str = notes.get("booking_id")

    if not booking_id_str and order_id:
        from app.models import Payment as PaymentModel
        stmt = select(PaymentModel).where(PaymentModel.razorpay_order_id == order_id)
        res = await db.execute(stmt)
        pm = res.scalar_one_or_none()
        if pm:
            booking_id_str = str(pm.booking_id)

    if not booking_id_str:
        logger.warning(f"Could not find booking_id for payment {payment_id} / order {order_id}")
        return

    from uuid import UUID
    from app.services.booking_orchestrator import BookingOrchestrator
    from app.services.tripjack_adapter import TripJackAdapter
    
    try:
        booking_id = UUID(booking_id_str)
        
        # Initialize Orchestrator
        tripjack = TripJackAdapter(
            api_key=settings.TRIPJACK_API_KEY, 
            base_url=settings.TRIPJACK_BASE_URL
        )
        orchestrator = BookingOrchestrator(db, tripjack)
        
        # Confirm
        await orchestrator.confirm_from_webhook(booking_id, payment_id or "webhook_verified")
        # Invalidate dashboard cache
        from fastapi_cache import FastAPICache
        await FastAPICache.clear(namespace="dashboard")
        
        logger.info(f"[Webhook] Successfully processed booking {booking_id}")
        
    except Exception as e:
        logger.error(f"[Webhook] Failed to confirm booking {booking_id_str}: {e}")
