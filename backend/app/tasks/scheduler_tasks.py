import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import List

from sqlalchemy import select, and_, not_
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.database import AsyncSessionLocal, engine
from app.models import Booking, BookingStatus, NotificationLog, User, Package, Subscription, Notification
from app.services.customer_notification_service import CustomerNotificationService
from app.services.agent_notification_service import AgentNotificationService

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.scheduler_tasks.send_daily_trip_reminders")
def send_daily_trip_reminders():
    """
    Periodic task to send trip reminders (7d, 3d, 1d before travel)
    """
    logger.info("Starting daily trip reminder job")
    
    # Run async logic
    asyncio.run(_process_reminders())

async def _process_reminders():
    try:
        async with AsyncSessionLocal() as session:
            today = date.today()
            
            # Reminder thresholds
            reminders = [
                {"days": 7, "type": "trip_reminder_7d"},
                {"days": 3, "type": "trip_reminder_3d"},
                {"days": 1, "type": "trip_reminder_1d"}
            ]
            
            for r in reminders:
                target_date = today + timedelta(days=r["days"])
                template_type = r["type"]
                
                logger.info(f"Checking for {template_type} (Target Date: {target_date})")
                
                # 1. Find bookings on target_date that don't have this reminder logged yet
                # We use a subquery to exclude bookings already reminded
                stmt = (
                    select(Booking)
                    .options(
                        selectinload(Booking.user),
                        selectinload(Booking.package),
                        selectinload(Booking.agent)
                    )
                    .where(
                        and_(
                            Booking.travel_date == target_date,
                            Booking.status == BookingStatus.CONFIRMED,
                            # Exclude those already having a SUCCESSFUL or PENDING log for this type
                            not_(
                                select(NotificationLog.id)
                                .where(
                                    and_(
                                        NotificationLog.booking_id == Booking.id,
                                        NotificationLog.type == template_type,
                                        NotificationLog.status.in_(["sent", "pending"])
                                    )
                                )
                                .exists()
                            )
                        )
                    )
                )
                
                result = await session.execute(stmt)
                bookings_to_remind = result.scalars().all()
                
                logger.info(f"Found {len(bookings_to_remind)} bookings for {template_type}")
                
                for booking in bookings_to_remind:
                    try:
                        logger.info(f"Triggering {template_type} for booking {booking.booking_reference}")
                        await CustomerNotificationService.send_trip_reminder(booking, r["days"])
                    except Exception as e:
                        logger.error(f"Failed to send {template_type} for {booking.booking_reference}: {e}")
    
    except Exception as e:
        logger.error(f"Error in _process_reminders: {e}", exc_info=True)
    finally:
        # Crucial for Windows Celery worker stability
        await engine.dispose()
        logger.info("Engine disposed in scheduler task")

@celery_app.task(name="app.tasks.scheduler_tasks.send_expired_subscription_reminders")
def send_expired_subscription_reminders():
    """
    Periodic task to send subscription expired reminders (daily for 3 days)
    """
    logger.info("Starting daily subscription reminder job")
    asyncio.run(_process_expired_subscriptions())

async def _process_expired_subscriptions():
    from datetime import timezone
    try:
        async with AsyncSessionLocal() as session:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            threshold_date = now - timedelta(days=3)
            
            stmt = (
                select(Subscription)
                .options(selectinload(Subscription.user))
                .where(
                    and_(
                        Subscription.status == 'expired',
                        Subscription.expires_at >= threshold_date,
                        Subscription.expires_at <= now
                    )
                )
            )
            
            result = await session.execute(stmt)
            expired_subs = result.scalars().all()
            
            for sub in expired_subs:
                if not sub.user:
                    continue
                    
                days_since = (now - sub.expires_at).days
                if days_since < 0 or days_since > 3:
                    continue
                
                # Check if notification already sent today
                notif_stmt = select(Notification).where(
                    and_(
                        Notification.user_id == sub.user_id,
                        Notification.type == "subscription_expired",
                        Notification.created_at >= today_start
                    )
                )
                notif_res = await session.execute(notif_stmt)
                already_sent = notif_res.scalars().first()
                
                if not already_sent:
                    # Create notification
                    notification = Notification(
                        user_id=sub.user_id,
                        type="subscription_expired",
                        title="Subscription Expired",
                        message="Your subscription plan has expired. Please subscribe to continue using the platform."
                    )
                    session.add(notification)
                    await session.commit()
                    
                    # Trigger Email
                    try:
                        logger.info(f"Triggering subscription expired email for {sub.user.email}")
                        await AgentNotificationService.send_subscription_expired_email(sub.user, days_since)
                    except Exception as e:
                        logger.error(f"Failed to send expiration email to {sub.user.email}: {e}")
    except Exception as e:
        logger.error(f"Error in _process_expired_subscriptions: {e}", exc_info=True)
    finally:
        await engine.dispose()
        logger.info("Engine disposed in expired subscription task")

if __name__ == "__main__":
    # Manual test run
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_process_reminders())
    asyncio.run(_process_expired_subscriptions())
