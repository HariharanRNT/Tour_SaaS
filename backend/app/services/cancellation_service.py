"""
Cancellation & Refund Service for Tour SaaS.

Responsibilities:
  1. Calculate refund amount based on package cancellation rules (IST timezone-aware).
  2. Orchestrate cancellation: lock booking row, validate guards, trigger Razorpay refund,
     persist BookingRefund record, update booking status.
  3. All DB writes in a single try/except with rollback on failure.
"""

import logging
import time
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pytz import timezone as tz
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Agent, Booking, BookingRefund, BookingStatus,
    Package, PaymentStatus
)
from app.services.razorpay_service import RazorpayService
from app.utils.crypto import decrypt_value

logger = logging.getLogger(__name__)

INDIA_TZ = tz("Asia/Kolkata")


# ---------------------------------------------------------------------------
# Refund Calculation (pure, no DB side-effects)
# ---------------------------------------------------------------------------

def calculate_refund(booking: Booking, rules: list) -> dict:
    """
    Return a dict with refund details given a booking and its package cancellation rules.

    Rules must already be stored in **descending** daysBefore order
    (enforced by validate_and_sort_rules on save).

    Returns:
        {
            days_before:       int,
            paid_amount:       float,
            refund_amount:     float,
            refund_percentage: float,
            message:           str
        }
    """
    india_today = datetime.now(INDIA_TZ).date()
    days_before = (booking.travel_date - india_today).days

    # Sum only succeeded payments — never refund more than what was collected.
    # SQLAlchemy may return the enum object OR the raw string depending on driver.
    paid = sum(
        float(p.amount)
        for p in (booking.payments or [])
        if (
            p.status == PaymentStatus.SUCCEEDED
            or str(p.status) in ("succeeded", "PaymentStatus.SUCCEEDED", "SUCCEEDED")
        )
    )

    logger.info(
        f"[Booking {booking.id}] Refund calc: days_before={days_before}, paid=₹{paid}"
    )

    if days_before < 0:
        return {
            "days_before": days_before,
            "paid_amount": paid,
            "refund_amount": 0.0,
            "refund_percentage": 0.0,
            "message": "Cannot cancel — travel date has already passed.",
        }

    if not rules:
        return {
            "days_before": days_before,
            "paid_amount": paid,
            "refund_amount": 0.0,
            "refund_percentage": 0.0,
            "message": "No refund — cancellation policy not configured for this package.",
        }

    # Rules are pre-sorted descending by daysBefore.
    # Pick the first rule where days_before >= rule.daysBefore
    applicable = next(
        (r for r in rules if days_before >= r["daysBefore"]), None
    )
    pct = float(applicable["refundPercentage"]) if applicable else 0.0
    amount = round(paid * pct / 100, 2)

    logger.info(
        f"[Booking {booking.id}] Applicable rule: {applicable} → pct={pct}%, refund=₹{amount}"
    )

    if pct == 0:
        msg = f"No refund — cancellation {days_before} day(s) before travel is non-refundable per policy."
    else:
        msg = (
            f"You will receive ₹{amount:,.2f} ({pct:.0f}% refund) — "
            f"based on cancellation {days_before} day(s) before travel."
        )

    return {
        "days_before": days_before,
        "paid_amount": paid,
        "refund_amount": amount,
        "refund_percentage": pct,
        "message": msg,
    }


# ---------------------------------------------------------------------------
# Rule Validation
# ---------------------------------------------------------------------------

def validate_and_sort_rules(rules: list) -> list:
    """
    Validate cancellation rules and return them sorted in descending daysBefore order.
    Raises ValueError on validation failure.
    """
    if not rules:
        # Auto-fallback: explicit 0%-refund rule so policy is clear
        return [{"daysBefore": 0, "refundPercentage": 0}]

    for r in rules:
        pct = r.get("refundPercentage", -1)
        if not (0 <= float(pct) <= 100):
            raise ValueError(f"refundPercentage must be 0–100, got {pct}")

    days_list = [r["daysBefore"] for r in rules]
    if len(days_list) != len(set(days_list)):
        raise ValueError("Duplicate daysBefore values in cancellation rules")

    sorted_rules = sorted(rules, key=lambda x: -x["daysBefore"])
    if [r["daysBefore"] for r in rules] != [r["daysBefore"] for r in sorted_rules]:
        raise ValueError("Cancellation rules must be in descending daysBefore order")

    return sorted_rules


# ---------------------------------------------------------------------------
# Cancellation Orchestration
# ---------------------------------------------------------------------------

async def process_cancellation(
    booking_id: str,
    db: AsyncSession,
) -> dict:
    """
    Fully orchestrate booking cancellation:
      1. Lock booking row (SELECT FOR UPDATE) — prevents race conditions.
      2. Guard: already cancelled / travel date past.
      3. Calculate refund.
      4. Resolve agent Razorpay keys: booking.agent_id → Agent → agent_razorpay_settings.
      5. Decrypt key_secret and call Razorpay refund API.
         On failure → set refund_status = 'pending' (manual retry).
      6. Persist BookingRefund + update Booking — all in one atomic transaction.

    Returns enriched cancel result dict.
    """
    # 1. Lock row — prevents concurrent double-cancellations
    stmt = (
        sa_select(Booking)
        .where(Booking.id == booking_id)
        .with_for_update()
        .options(
            selectinload(Booking.payments),
            selectinload(Booking.package),
            selectinload(Booking.travelers),
        )
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise ValueError("Booking not found")

    # 2. Idempotency & date guards
    if booking.status == BookingStatus.CANCELLED:
        raise ValueError("Booking is already cancelled")

    india_today = datetime.now(INDIA_TZ).date()
    if booking.travel_date < india_today:
        raise ValueError("Cannot cancel — travel date has already passed")

    try:
        # 3. Calculate refund based on package cancellation rules
        package = booking.package
        rules = (package.cancellation_rules or []) if package else []
        calc = calculate_refund(booking, rules)

        if calc["days_before"] < 0:
            raise ValueError(calc["message"])

        # 4. Resolve the latest succeeded payment (to get razorpay_payment_id)
        succeeded_payment = next(
            (
                p for p in reversed(booking.payments or [])
                if (
                    p.status == PaymentStatus.SUCCEEDED
                    or str(p.status) in ("succeeded", "PaymentStatus.SUCCEEDED", "SUCCEEDED")
                )
            ),
            None,
        )
        payment_id: Optional[str] = (
            succeeded_payment.razorpay_payment_id if succeeded_payment else None
        )

        # 5. Resolve agent Razorpay keys from agent_razorpay_settings table
        #    Path: booking.agent_id → Agent (agent profile) → razorpay_settings
        razorpay_refund_id = None
        refund_status = "pending"
        failure_reason = None

        if calc["refund_amount"] > 0 and payment_id:
            rp_cfg = None

            # Resolve credentials from the agent who CREATED the package
            # Path: booking → package → created_by (user_id) → Agent → razorpay_settings
            package_creator_user_id = getattr(package, "created_by", None) if package else None

            if package_creator_user_id:
                agent_stmt = (
                    sa_select(Agent)
                    .where(Agent.user_id == package_creator_user_id)
                    .options(selectinload(Agent.razorpay_settings))
                )
                agent_result = await db.execute(agent_stmt)
                agent = agent_result.scalar_one_or_none()
                if agent:
                    rp_cfg = agent.razorpay_settings
                    logger.info(
                        f"[Booking {booking.id}] Using Razorpay keys for agent "
                        f"user_id={package_creator_user_id} (package creator)"
                    )

            if rp_cfg and rp_cfg.key_id and rp_cfg.key_secret:
                try:
                    # Decrypt the key_secret (stored encrypted via Fernet)
                    decrypted_secret = decrypt_value(rp_cfg.key_secret)

                    rp_result = RazorpayService.refund_payment(
                        payment_id=payment_id,
                        amount_paise=int(calc["refund_amount"] * 100),
                        key_id=rp_cfg.key_id,
                        key_secret=decrypted_secret,
                    )
                    razorpay_refund_id = rp_result.get("id")
                    refund_status = "succeeded" if razorpay_refund_id else "failed"
                    logger.info(
                        f"[Booking {booking.id}] Razorpay refund {refund_status}: "
                        f"refund_id={razorpay_refund_id}"
                    )
                except Exception as e:
                    refund_status = "pending"
                    failure_reason = str(e)
                    logger.error(
                        f"[Booking {booking.id}] Razorpay refund API failed: {e}"
                    )
            else:
                failure_reason = "Agent Razorpay credentials not configured"
                logger.warning(
                    f"[Booking {booking.id}] No Razorpay config for agent_id={agent_user_id} "
                    f"— refund marked pending"
                )

        elif calc["refund_amount"] == 0:
            # 0-amount = non-refundable; mark as succeeded instantly
            refund_status = "succeeded"

        # 6. Persist BookingRefund (unique constraint on booking_id prevents double-insert)
        refund_record = BookingRefund(
            booking_id=booking.id,
            razorpay_payment_id=payment_id,
            razorpay_refund_id=razorpay_refund_id,
            refund_amount=Decimal(str(calc["refund_amount"])),
            refund_percentage=Decimal(str(calc["refund_percentage"])),
            days_before=calc["days_before"],
            status=refund_status,
            failure_reason=failure_reason,
        )
        db.add(refund_record)

        # 7. Update booking
        booking.status = BookingStatus.CANCELLED
        booking.refund_amount = Decimal(str(calc["refund_amount"]))
        booking.cancelled_at = datetime.now(INDIA_TZ)

        await db.commit()

        # Build user-facing message
        if refund_status == "succeeded" and calc["refund_amount"] > 0:
            user_msg = (
                f"Booking cancelled. ₹{calc['refund_amount']:,.2f} refund will be "
                f"credited to your original payment method in 5–7 business days."
            )
        elif refund_status == "pending" and calc["refund_amount"] > 0:
            user_msg = (
                f"Booking cancelled. Refund of ₹{calc['refund_amount']:,.2f} is being "
                f"processed manually — you will be notified once it's done."
            )
        else:
            user_msg = "Booking cancelled. No refund is applicable as per the cancellation policy."

        logger.info(
            f"[Booking {booking.id}] Cancellation complete. refund_status={refund_status}, "
            f"refund=₹{calc['refund_amount']}"
        )

        return {
            "booking_id": str(booking.id),
            "status": "cancelled",
            "refund_amount": calc["refund_amount"],
            "refund_percentage": calc["refund_percentage"],
            "days_before": calc["days_before"],
            "refund_status": refund_status,
            "message": user_msg,
        }

    except Exception:
        await db.rollback()
        raise
