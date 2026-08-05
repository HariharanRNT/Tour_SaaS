"""
Split Payment Celery Tasks

Three scheduled tasks — do NOT modify existing scheduler_tasks.py.
All three use BookingPayment.razorpay_link_id as the authoritative
"link generated/not generated" flag.

Beat schedule registration is done at the bottom of celery_app.py.
"""

import logging
from datetime import date, timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Task 1: trigger_final_payment_links
# Runs 9AM daily; date_wise bookings where link NOT yet generated
# ---------------------------------------------------------------------------

@shared_task(name="split_payment.trigger_final_payment_links", bind=True, max_retries=3)
def trigger_final_payment_links(self):
    """
    Disabled as per user request: 'Dont send the link, just give a payment option for button'
    
    For date_wise split bookings whose final payment is due in 7 days,
    generate a Razorpay Payment Link and email it to the customer.

    Filter uses BookingPayment.razorpay_link_id == None — this IS the
    authoritative 'link not yet generated' check. There is no separate
    final_payment_enabled boolean field.
    """
    return
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async def _run():
        from app.database import AsyncSessionLocal
        from app.models import Booking, BookingPayment
        from app.services.split_payment_service import enable_final_payment

        today = date.today()
        target_due_date = today + timedelta(days=7)

        async with AsyncSessionLocal() as db:
            # Find FINAL BookingPayment records with no link yet
            # Join to Booking to apply state filters
            stmt = (
                select(Booking)
                .join(BookingPayment, BookingPayment.booking_id == Booking.id)
                .where(
                    Booking.is_split_payment == True,
                    Booking.split_payment_mode == 'date_wise',
                    Booking.advance_payment_status == 'PAID',
                    Booking.final_payment_status == 'PENDING',
                    Booking.final_payment_due_date == target_due_date,
                    Booking.status != 'CANCELLED',
                    BookingPayment.payment_type == 'FINAL',
                    BookingPayment.razorpay_link_id == None,  # link NOT yet generated
                )
                .options(
                    selectinload(Booking.booking_payments),
                    selectinload(Booking.user),
                    selectinload(Booking.package),
                    selectinload(Booking.agent),
                )
                .distinct()
            )
            result = await db.execute(stmt)
            bookings = result.scalars().all()

            logger.info(
                f"[trigger_final_payment_links] Found {len(bookings)} booking(s) "
                f"due on {target_due_date}"
            )

            for booking in bookings:
                try:
                    link_url = await enable_final_payment(
                        booking_id=booking.id,
                        triggered_by='SYSTEM',
                        triggered_by_name='System Auto Trigger',
                        db=db,
                    )
                    logger.info(
                        f"[trigger_final_payment_links] Booking {booking.id}: "
                        f"link generated → {link_url}"
                    )
                except Exception as e:
                    logger.error(
                        f"[trigger_final_payment_links] Booking {booking.id} failed: {e}"
                    )

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Task 2: send_final_payment_reminders
# Runs 9AM daily; bookings where link already generated, send reminder
# ---------------------------------------------------------------------------

@shared_task(name="split_payment.send_final_payment_reminders", bind=True, max_retries=3)
def send_final_payment_reminders(self):
    """
    For split bookings where the payment link already exists, send a reminder
    email at T-7, T-3, T-1, and T+1 days.

    Filter uses BookingPayment.razorpay_link_id != None — this IS the
    authoritative 'link already active' check.
    Reuses existing link URL — does NOT create a new Razorpay payment link.
    """
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async def _run():
        from app.database import AsyncSessionLocal
        from app.models import Booking, BookingPayment
        from app.services.customer_notification_service import CustomerNotificationService

        today = date.today()
        reminder_offsets = [7, 3, 1, -1]  # days before (positive) or after (negative) due date
        target_dates = [today + timedelta(days=d) for d in reminder_offsets]

        async with AsyncSessionLocal() as db:
            stmt = (
                select(Booking, BookingPayment)
                .join(BookingPayment, BookingPayment.booking_id == Booking.id)
                .where(
                    Booking.is_split_payment == True,
                    Booking.advance_payment_status == 'PAID',
                    Booking.final_payment_status == 'PENDING',
                    Booking.status != 'CANCELLED',
                    BookingPayment.payment_type == 'FINAL',
                    BookingPayment.razorpay_link_id != None,  # link already generated
                    Booking.final_payment_due_date.in_(target_dates),
                )
                .options(
                    selectinload(Booking.user),
                    selectinload(Booking.package),
                    selectinload(Booking.agent),
                )
            )
            result = await db.execute(stmt)
            rows = result.all()

            logger.info(f"[send_final_payment_reminders] Found {len(rows)} reminder(s) to send")

            for booking, final_bp in rows:
                try:
                    days_remaining = (booking.final_payment_due_date - today).days
                    link_url = final_bp.razorpay_link_url or ""

                    await CustomerNotificationService.send_final_payment_reminder(
                        booking=booking,
                        days_remaining=days_remaining,
                        link_url=link_url,
                    )

                    # Update link_sent_at timestamp
                    from datetime import datetime, timezone
                    final_bp.link_sent_at = datetime.now(timezone.utc)
                    await db.commit()

                    logger.info(
                        f"[send_final_payment_reminders] Reminder sent for "
                        f"booking {booking.id} (days_remaining={days_remaining})"
                    )
                except Exception as e:
                    logger.error(
                        f"[send_final_payment_reminders] Booking {booking.id} failed: {e}"
                    )

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Task 3: flag_overdue_split_payments
# Runs 10AM daily; sends agent alert for overdue final payments
# ---------------------------------------------------------------------------

@shared_task(name="split_payment.flag_overdue_split_payments", bind=True, max_retries=3)
def flag_overdue_split_payments(self):
    """
    Find split bookings where final payment is overdue (due_date < today, still PENDING).
    Send a grouped overdue alert to each affected agent.
    Does NOT auto-cancel — the agent decides.
    """
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from collections import defaultdict

    async def _run():
        from app.database import AsyncSessionLocal
        from app.models import Booking, User

        today = date.today()

        async with AsyncSessionLocal() as db:
            stmt = (
                select(Booking)
                .where(
                    Booking.is_split_payment == True,
                    Booking.final_payment_status == 'PENDING',
                    Booking.final_payment_due_date < today,
                    Booking.status != 'CANCELLED',
                )
                .options(
                    selectinload(Booking.user),
                    selectinload(Booking.package),
                    selectinload(Booking.agent),
                )
            )
            result = await db.execute(stmt)
            overdue_bookings = result.scalars().all()

            logger.info(
                f"[flag_overdue_split_payments] Found {len(overdue_bookings)} overdue booking(s)"
            )

            # Group by agent
            by_agent = defaultdict(list)
            for booking in overdue_bookings:
                agent_id = booking.agent_id
                if agent_id:
                    by_agent[agent_id].append(booking)

            # Send one alert per agent
            from app.services.customer_notification_service import CustomerNotificationService
            for agent_id, agent_bookings in by_agent.items():
                try:
                    # Get agent User object from the first booking
                    agent_user = agent_bookings[0].agent
                    if not agent_user:
                        # Fallback: load directly
                        agent_res = await db.execute(select(User).where(User.id == agent_id))
                        agent_user = agent_res.scalar_one_or_none()

                    if agent_user:
                        await CustomerNotificationService.send_split_payment_overdue_agent_alert(
                            agent_user=agent_user,
                            overdue_bookings=agent_bookings,
                        )
                        logger.info(
                            f"[flag_overdue_split_payments] Alert sent to agent {agent_id} "
                            f"for {len(agent_bookings)} overdue booking(s)"
                        )
                    else:
                        logger.warning(
                            f"[flag_overdue_split_payments] Agent {agent_id} not found"
                        )
                except Exception as e:
                    logger.error(
                        f"[flag_overdue_split_payments] Agent {agent_id} alert failed: {e}"
                    )

    asyncio.run(_run())
