import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import AsyncSessionLocal
from app.models import Booking, User, PaymentStatus
from app.services.customer_notification_service import CustomerNotificationService
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def test_consolidated_notification():
    async with AsyncSessionLocal() as session:
        # 1. Fetch a recent booking with package and user
        stmt = select(Booking).options(
            selectinload(Booking.package),
            selectinload(Booking.user),
            selectinload(Booking.agent).selectinload(User.agent_profile)
        ).limit(1)
        
        result = await session.execute(stmt)
        booking = result.scalars().first()
        
        if not booking:
            print("No booking found in database to test with.")
            return

        print(f"Testing consolidated notification for Booking: {booking.booking_reference}")
        print(f"Customer: {booking.user.email}")
        
        # 2. Mock payment details
        payment_details = {
            "amount": float(booking.total_amount),
            "method": "Test Consolidated Payment",
            "date": "2026-03-25"
        }
        
        # 3. Trigger the consolidated notification
        await CustomerNotificationService.send_booking_success_consolidated(booking, payment_details)
        
        print("\nNotification enqueued successfully.")

if __name__ == "__main__":
    asyncio.run(test_consolidated_notification())
