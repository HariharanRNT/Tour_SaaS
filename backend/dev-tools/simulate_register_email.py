import asyncio
import os
import sys
import uuid

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import User, UserRole, Customer
from app.services.customer_notification_service import CustomerNotificationService
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def simulate_registration_notification():
    async with AsyncSessionLocal() as session:
        # 1. Find a test customer with profiles loaded
        result = await session.execute(
            select(User)
            .options(selectinload(User.customer_profile).selectinload(Customer.agent))
            .where(User.role == UserRole.CUSTOMER)
            .limit(1)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("No test customer found.")
            return

        print(f"Simulating welcome email for {user.email}...")
        
        # 2. Trigger notification
        await CustomerNotificationService.send_registration_welcome(user)
        print("Notification queued successfully.")

if __name__ == "__main__":
    asyncio.run(simulate_registration_notification())
