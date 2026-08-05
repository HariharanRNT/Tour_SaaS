import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import List

from sqlalchemy import select, and_, not_
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.models import Booking, BookingStatus, NotificationLog, User, Package, Subscription, Notification
from app.services.customer_notification_service import CustomerNotificationService
from app.services.agent_notification_service import AgentNotificationService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.scheduler_tasks.process_scheduled_emails")
def process_scheduled_emails():
    """
    Periodic task to process pre-scheduled emails.
    Scheduled via Celery Beat (e.g. hourly).
    """
    logger.info("Starting scheduled emails processing job")
    asyncio.run(_process_scheduled_emails_async())

async def _process_scheduled_emails_async():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.pool import NullPool
    from app.config import settings
    from app.services.email_log_service import EmailLogService

    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    TaskSessionLocal = async_sessionmaker(task_engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with TaskSessionLocal() as session:
            logs = await EmailLogService.get_ready_scheduled_logs(session=session)
        logger.info(f"Found {len(logs)} scheduled emails ready to send")

        async with TaskSessionLocal() as session:
            for log in logs:
                try:
                    metadata = log.metadata_info or {}
                    booking_id = metadata.get("booking_id")
                    days_prior = metadata.get("days_prior")
                    
                    if not booking_id or not days_prior:
                        logger.warning(f"Scheduled log {log.id} missing metadata. Marking failed.")
                        await EmailLogService.update_log_status(log.id, "failed", "Missing metadata", session=session)
                        continue
                        
                    # Fetch booking
                    stmt = (
                        select(Booking)
                        .options(
                            selectinload(Booking.user),
                            selectinload(Booking.package),
                            selectinload(Booking.agent)
                        )
                        .where(Booking.id == booking_id)
                    )
                    result = await session.execute(stmt)
                    booking = result.scalar_one_or_none()
                    
                    if not booking or booking.status != BookingStatus.CONFIRMED:
                        logger.info(f"Skipping scheduled log {log.id}: Booking {booking_id} not found or not confirmed")
                        await EmailLogService.cancel_scheduled_logs(booking_id, session=session)
                        continue
                        
                    logger.info(f"Triggering scheduled {days_prior}d reminder for booking {booking.booking_reference}")
                    # Pass the existing log ID so it gets updated instead of a new one being created
                    await CustomerNotificationService.send_trip_reminder(booking, days_prior, existing_email_log_id=str(log.id), session=session)
                except Exception as e:
                    logger.error(f"Failed to process scheduled email {log.id}: {e}", exc_info=True)

    except Exception as e:
        logger.error(f"Error in _process_scheduled_emails_async: {e}", exc_info=True)
    finally:
        await task_engine.dispose()
        logger.info("Task-local engine disposed in process_scheduled_emails")


@celery_app.task(name="app.tasks.scheduler_tasks.send_expired_subscription_reminders")
def send_expired_subscription_reminders():
    """
    Periodic task to send subscription expired reminders (daily for 3 days).
    Scheduled via Celery Beat (see celery_app.py beat_schedule).
    """
    logger.info("Starting daily subscription reminder job")
    asyncio.run(_process_expired_subscriptions())


async def _process_expired_subscriptions():
    """
    Uses a task-local NullPool engine to avoid disposing the shared global engine.
    Safe to call repeatedly from Celery workers.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.pool import NullPool
    from app.config import settings
    from datetime import timezone

    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    TaskSessionLocal = async_sessionmaker(task_engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with TaskSessionLocal() as session:
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
                        await AgentNotificationService.send_subscription_expired_email(sub.user, days_since, session=session)
                    except Exception as e:
                        logger.error(f"Failed to send expiration email to {sub.user.email}: {e}")

    except Exception as e:
        logger.error(f"Error in _process_expired_subscriptions: {e}", exc_info=True)
    finally:
        # Safe to dispose — this is the task-local engine, not the global shared one
        await task_engine.dispose()
        logger.info("Task-local engine disposed in send_expired_subscription_reminders")


if __name__ == "__main__":
    # Manual test run
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_process_scheduled_emails_async())
    asyncio.run(_process_expired_subscriptions())
