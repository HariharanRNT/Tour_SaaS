from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from uuid import UUID

from app.database import get_db
from app.models import User, Notification
from app.api.deps import get_current_admin
from app.schemas import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """List all notifications for the current admin"""
    stmt = select(Notification).where(
        Notification.user_id == current_admin.id
    ).order_by(Notification.created_at.desc())
    
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Mark a notification as read"""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_admin.id
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    
    return notification

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Delete a notification"""
    stmt = delete(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_admin.id
    )
    result = await db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    await db.commit()
