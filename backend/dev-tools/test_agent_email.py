import asyncio
import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import Booking
from app.services.email_service import EmailService
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import json

async def test_agent_notification(ref):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.agent), selectinload(Booking.package))
            .where(Booking.booking_reference == ref)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            print(f"Booking {ref} not found.")
            return

        agent_user = booking.agent
        subject = f"TEST AGENT NOTIFICATION: {booking.booking_reference}"
        
        # Simplified version of the HTML from BookingOrchestrator
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>New Booking Received!</h2>
            <p>Dear {agent_user.first_name},</p>
            <p>You have received a new booking for <strong>{booking.package.title}</strong>.</p>
            <ul>
                <li>Reference: {booking.booking_reference}</li>
                <li>Customer: {booking.user.first_name} {booking.user.last_name}</li>
            </ul>
        </body>
        </html>
        """

        print(f"Sending test Agent Notification to {agent_user.email}...")
        success = await EmailService.send_email(
            to_email=agent_user.email,
            subject=subject,
            body=html_body
        )
        
        if success:
            print("SUCCESS: Agent notification sent!")
        else:
            print("FAILURE: Agent notification failed.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(test_agent_notification(sys.argv[1]))
    else:
        print("Provide reference.")
