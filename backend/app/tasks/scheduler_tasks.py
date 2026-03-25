import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import List

from sqlalchemy import select, and_, not_
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.database import AsyncSessionLocal, engine
from app.models import Booking, BookingStatus, NotificationLog, User, Package
from app.services.customer_notification_service import CustomerNotificationService

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

if __name__ == "__main__":
    # Manual test run
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_process_reminders())
