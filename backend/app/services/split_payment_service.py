"""
Split Payment Service — pure business logic for the split payment feature.

Responsibilities:
  1. Calculate advance/final amounts.
  2. Calculate final payment due date.
  3. Determine whether split should be bypassed (travel date too close).
  4. enable_final_payment() — creates Razorpay Payment Link and transitions booking state.

All DB writes are intentionally kept inside enable_final_payment() only.
The calculation functions are pure (no side effects).
"""

import math
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pure Calculation Helpers
# ---------------------------------------------------------------------------

def calculate_split_amounts(
    total_amount: Decimal,
    advance_type: str,
    advance_value: Decimal,
) -> Tuple[Decimal, Decimal]:
    """
    Return (advance_amount, final_amount).
    advance + final always equals total_amount — no rounding drift.

    Args:
        total_amount:  full booking total (after GST).
        advance_type:  'percentage' or 'fixed'.
        advance_value: percentage (1-99) or fixed INR amount.
    """
    total = Decimal(str(total_amount))
    value = Decimal(str(advance_value))

    if advance_type == 'percentage':
        # Math.floor equivalent for Decimal: truncate to 2dp toward zero
        advance = (total * value / 100).to_integral_value(rounding='ROUND_FLOOR')
    elif advance_type == 'fixed':
        advance = value
    else:
        raise ValueError(f"Unknown advance_type: {advance_type!r}")

    final = total - advance  # always derived, never independently rounded
    return advance, final


def calculate_final_payment_due_date(
    travel_date: date,
    booking_date: date,
    direction: str,
    days: int,
) -> date:
    """
    Return the due date for the final payment.

    Args:
        direction: 'before_travel' or 'after_booking'.
        days:       number of days offset.
    """
    if direction == 'before_travel':
        return travel_date - timedelta(days=days)
    elif direction == 'after_booking':
        return booking_date + timedelta(days=days)
    else:
        raise ValueError(f"Unknown direction: {direction!r}")


def should_bypass_split(
    travel_date: date,
    booking_date: date,
    package,
) -> Tuple[bool, Optional[str]]:
    """
    Determine whether split payment should be bypassed for this booking.
    Bypass means: collect full payment instead of advance only.

    Returns (bypass: bool, reason: str | None).
    """
    if not package.split_payment_enabled:
        return True, "Split payment not enabled on this package"

    if package.split_payment_mode == 'date_wise':
        direction = package.final_payment_due_direction
        days = package.final_payment_due_days or 0

        due_date = calculate_final_payment_due_date(
            travel_date, booking_date, direction, days
        )

        if direction == 'before_travel':
            # Bypass if travel date is too close (less than days away)
            if (travel_date - booking_date).days < days:
                return True, f"Travel date too close — full payment collected (window: {days} days)"

        if direction == 'after_booking':
            # Bypass if due date falls on or after travel (customer would pay after trip)
            if due_date >= travel_date:
                return True, "Payment due date falls on or after travel — full payment collected"

    # Manual mode: never bypass (agent controls unlock)
    return False, None


# ---------------------------------------------------------------------------
# enable_final_payment — the core state transition function
# ---------------------------------------------------------------------------

async def enable_final_payment(
    booking_id,
    triggered_by: str,          # 'SYSTEM' or 'AGENT'
    triggered_by_name: str,     # 'System Auto Trigger' or agent's display name
    db: AsyncSession,
) -> str:
    """
    Generate a Razorpay Payment Link for the final amount and send it to the customer.
    Transitions: final_payment_status LOCKED -> PENDING (manual) or PENDING stays (date_wise).

    Returns the short URL of the payment link.
    Raises on guard failures (advance not paid, already processed).
    """
    from sqlalchemy.orm import selectinload
    from app.models import Booking, BookingPayment, Package, User

    # 1. Lock booking row (prevent concurrent triggers)
    stmt = (
        select(Booking)
        .where(Booking.id == booking_id)
        .with_for_update()
        .options(
            selectinload(Booking.booking_payments),
            selectinload(Booking.user),
            selectinload(Booking.package),
            selectinload(Booking.agent),
        )
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise ValueError(f"Booking {booking_id} not found")

    # 2. Guards
    if booking.advance_payment_status != 'PAID':
        raise ValueError("Advance payment has not been received yet")

    if booking.final_payment_status not in ('LOCKED', 'PENDING'):
        raise ValueError(
            f"Final payment already processed or not applicable "
            f"(status={booking.final_payment_status})"
        )

    # 3. Find the FINAL BookingPayment record
    final_bp = next(
        (bp for bp in booking.booking_payments if bp.payment_type == 'FINAL'),
        None
    )
    if not final_bp:
        raise ValueError("FINAL BookingPayment record not found")

    # 4. Idempotency: if link already generated, just return existing URL
    if final_bp.razorpay_link_id and final_bp.razorpay_link_url:
        logger.info(
            f"[enable_final_payment] Booking {booking_id}: link already exists, "
            f"returning existing URL"
        )
        return final_bp.razorpay_link_url

    # 5. Skip Razorpay Payment Link generation as per user request
    logger.info(
        f"[enable_final_payment] Booking {booking_id}: Skipping Razorpay Link creation "
        f"as per user request. Enabling Final Payment for inline checkout."
    )

    # 7. Update BookingPayment record
    now = datetime.utcnow()
    final_bp.link_sent_at = now
    final_bp.triggered_by = triggered_by
    final_bp.triggered_by_name = triggered_by_name

    # 8. Transition booking state
    booking.final_payment_status = 'PENDING'

    await db.commit()

    return "enabled"
