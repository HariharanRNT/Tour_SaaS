import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import Booking, User
from app.services.customer_notification_service import CustomerNotificationService

async def test_resolve_recipient():
    async with AsyncSessionLocal() as db:
        # Get the latest booking
        result = await db.execute(
            select(Booking).order_by(Booking.created_at.desc()).limit(1).options(
                selectinload(Booking.user),
                selectinload(Booking.travelers)
            )
        )
        booking = result.scalar_one_or_none()
        
        if not booking:
            print("No bookings found to test.")
            return

        print(f"Testing for Booking ID: {booking.id}, Reference: {booking.booking_reference}")
        if booking.user:
            print(f"Booking User Email: {booking.user.email}, Role: {booking.user.role}")
            print(f"Role Type: {type(booking.user.role)}")
        else:
            print("Booking User is None!")

        email, name = CustomerNotificationService._resolve_recipient_info(booking)
        print(f"RESOLVED: email='{email}', name='{name}'")

        # Test logic for is_agent_booking
        is_agent_booking = booking.user and (
            booking.user.role == "agent" or 
            (hasattr(booking.user.role, 'value') and booking.user.role.value == "agent")
        )
        print(f"is_agent_booking (as per code): {is_agent_booking}")

if __name__ == "__main__":
    asyncio.run(test_resolve_recipient())
