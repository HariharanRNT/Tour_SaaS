import asyncio
import os
import sys

# Set up paths to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import Booking
from app.services.customer_notification_service import CustomerNotificationService

async def test_notification():
    async with AsyncSessionLocal() as session:
        # Get the latest booking
        from sqlalchemy import select
        result = await session.execute(select(Booking).order_by(Booking.created_at.desc()).limit(1))
        booking = result.scalar_one_or_none()
        
        if not booking:
            print("No bookings found to test with.")
            return
            
        print(f"Testing notification for booking {booking.id}")
        
        # We need to eager load the user for the notification
        from sqlalchemy.orm import selectinload
        result = await session.execute(
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.package))
            .where(Booking.id == booking.id)
        )
        booking = result.scalar_one()
        
        print(f"Customer: {booking.user.email}")
        
        # Test sending the notification
        try:
            await CustomerNotificationService.send_booking_confirmation(booking)
            print("Successfully queued notification!")
        except Exception as e:
            print(f"Error queuing notification: {e}")

if __name__ == "__main__":
    asyncio.run(test_notification())
