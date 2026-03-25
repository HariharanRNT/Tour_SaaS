import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models import Booking
from app.services.customer_notification_service import CustomerNotificationService
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as session:
        # Load a booking with all needed relations
        stmt = select(Booking).options(
            selectinload(Booking.package),
            selectinload(Booking.user),
            selectinload(Booking.agent)
        ).limit(1)
        
        result = await session.execute(stmt)
        booking = result.scalars().first()
        
        if booking:
            print(f"Testing consolidated notification for {booking.booking_reference}")
            await CustomerNotificationService.send_booking_success_consolidated(
                booking, 
                {'amount': 100.0, 'method': 'Final Verification', 'date': '2026-03-25'}
            )
            print("SUCCESS: Notification enqueued")
        else:
            print("No booking found to test.")

if __name__ == "__main__":
    asyncio.run(main())
