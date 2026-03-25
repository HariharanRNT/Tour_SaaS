import asyncio
import os
import sys
import json
from uuid import UUID

# Set up paths to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import Booking, User, NotificationLog, UserRole
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_booking():
    async with AsyncSessionLocal() as session:
        # Get the latest booking with relationships
        stmt = select(Booking).order_by(Booking.created_at.desc()).options(
            selectinload(Booking.user),
            selectinload(Booking.agent),
            selectinload(Booking.travelers)
        ).limit(1)
        result = await session.execute(stmt)
        booking = result.scalar_one_or_none()
        
        if not booking:
            print("No bookings found.")
            return

        print(f"--- Booking Details ---")
        print(f"ID: {booking.id}")
        print(f"Reference: {booking.booking_reference}")
        print(f"Status: {booking.status}")
        print(f"Payment Status: {booking.payment_status}")
        
        print(f"\n--- User (Owner) ---")
        if booking.user:
            print(f"ID: {booking.user.id}")
            print(f"Email: {booking.user.email}")
            print(f"Role: {booking.user.role}")
        else:
            print("No user linked.")

        print(f"\n--- Agent ---")
        if booking.agent:
            print(f"ID: {booking.agent.id}")
            print(f"Email: {booking.agent.email}")
        else:
            print("No agent linked.")

        print(f"\n--- Metadata (Special Requests) ---")
        print(booking.special_requests)
        if booking.special_requests:
            try:
                meta = json.loads(booking.special_requests)
                print(f"Customer Payment Email: {meta.get('customer_payment_email')}")
            except:
                print("Failed to parse metadata.")

        print(f"\n--- Notification Logs ---")
        stmt_logs = select(NotificationLog).where(NotificationLog.booking_id == booking.id).order_by(NotificationLog.created_at.desc())
        logs_result = await session.execute(stmt_logs)
        logs = logs_result.scalars().all()
        for log in logs:
            print(f"- Type: {log.type}, Status: {log.status}, Sent At: {log.sent_at}, Error: {log.error}")

if __name__ == "__main__":
    asyncio.run(check_booking())
