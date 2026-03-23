from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.models import Notification

class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        type: str,
        title: str,
        message: str
    ) -> Notification:
        """Create a new notification for a specific user"""
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def notify_new_booking(
        db: AsyncSession,
        agent_id: UUID,
        customer_name: str,
        package_title: str
    ):
        """Trigger a notification for a new booking"""
        await NotificationService.create_notification(
            db=db,
            user_id=agent_id,
            type="success",
            title="New Booking Received!",
            message=f"Customer {customer_name} has just booked '{package_title}'."
        )

    @staticmethod
    async def notify_subscription_expiry(
        db: AsyncSession,
        agent_id: UUID,
        days_left: int
    ):
        """Trigger a notification for subscription expiry"""
        # First check if such a notification already exists for today to avoid spam
        # For simplicity in this implementation, we'll just create it.
        # In a real app, we might check for existing unread warnings of the same type.
        
        message = f"Your subscription plan will expire in {days_left} days. Please renew to avoid service interruption."
        if days_left == 0:
            message = "Your subscription plan expires today! Please renew immediately."
            
        await NotificationService.create_notification(
            db=db,
            user_id=agent_id,
            type="warning",
            title="Subscription Expiry Warning",
            message=message
        )
