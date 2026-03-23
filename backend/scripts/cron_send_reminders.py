import asyncio
import os
import sys
import logging
from datetime import date, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Booking, BookingStatus
from app.services.customer_notification_service import CustomerNotificationService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def process_reminders():
    """
    Finds all confirmed bookings matching the 7, 3, and 1-day travel date thresholds
    and dispatches the appropriate email templates using CustomerNotificationService.
    """
    logger.info("Starting reminder dispatch process...")
    today = date.today()
    
    target_dates = {
        7: today + timedelta(days=7),
        3: today + timedelta(days=3),
        1: today + timedelta(days=1),
    }

    async with AsyncSessionLocal() as session:
        # Fetch all upcoming confirmed bookings
        stmt = select(Booking).where(Booking.status == BookingStatus.CONFIRMED).options(
            selectinload(Booking.package),
            selectinload(Booking.user).selectinload(User.customer_profile),
            selectinload(Booking.agent).selectinload(Agent.agent_profile).selectinload(AgentProfile.smtp_settings)
        )
        
        # We need imports for eager loading relationships
        from app.models import User, Agent, AgentProfile
        
        # Re-build statement with proper imports
        stmt = select(Booking).where(
            Booking.status == BookingStatus.CONFIRMED,
            # Ideally we filter by travel_date directly here for efficiency
            Booking.travel_date.in_([target_dates[7], target_dates[3], target_dates[1]])
        ).options(
            selectinload(Booking.package),
            selectinload(Booking.user), # Don't deep load if not strictly needed or handle carefully
            selectinload(Booking.agent)
        )
        
        result = await session.execute(stmt)
        bookings = result.scalars().all()
        
        logger.info(f"Found {len(bookings)} bookings matching target dates.")
        
        for booking in bookings:
            try:
                if not booking.travel_date:
                    continue
                    
                # Calculate exact diff
                # Assuming booking.travel_date is date or datetime
                t_date = booking.travel_date.date() if hasattr(booking.travel_date, 'date') else booking.travel_date
                
                days_prior = (t_date - today).days
                
                if days_prior in target_dates:
                    logger.info(f"Sending {days_prior}-day reminder for booking {booking.booking_reference}")
                    await CustomerNotificationService.send_trip_reminder(booking, days_prior=days_prior)
            except Exception as e:
                logger.error(f"Failed to process reminders for booking {booking.id}: {e}")

    logger.info("Finished reminder dispatch process.")

if __name__ == "__main__":
    asyncio.run(process_reminders())
