import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.api.deps import get_current_active_user, get_current_admin
from app.models import User
from app.models.email_log import EmailLog, EmailStatus, SenderType
from app.services.email_log_service import EmailLogService
from app.tasks.email_tasks import send_email_task
from sqlalchemy import update

router = APIRouter()

# Schema for responses
class EmailLogResponse(BaseModel):
    id: uuid.UUID
    recipient_email: str
    subject: str
    status: str
    created_at: datetime
    sender_type: str
    email_type: str
    retry_count: int

    class Config:
        from_attributes = True

class BulkRetryRequest(BaseModel):
    batch_size: int = 100

@router.get("/stats")
async def get_email_log_stats(
    current_user: User = Depends(get_current_admin)
):
    stats = await EmailLogService.get_stats()
    return stats

@router.get("/")
async def list_email_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin)
):
    logs, total = await EmailLogService.get_logs(
        page=page, 
        limit=limit, 
        status=status, 
        search=search
    )
    return {
        "data": logs,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{log_id}")
async def get_email_log_details(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_admin)
):
    log = await EmailLogService.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
    return log

@router.post("/{log_id}/retry")
async def retry_email_log(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    log = await EmailLogService.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
    if log.status not in [EmailStatus.FAILED, EmailStatus.EXPIRED]:
        raise HTTPException(status_code=400, detail="Only failed or expired emails can be retried")
    
    # Reset status
    log.status = EmailStatus.PENDING
    log.retry_count = 0
    
    if log.expires_at and log.expires_at < datetime.now(timezone.utc):
        # Extend expiry if needed or clear it
        log.expires_at = None
        
    await db.commit()
    
    send_email_task.delay(
        to_email=log.recipient_email,
        subject=log.subject,
        html_body=log.html_body,
        email_log_id=str(log.id)
    )
    
    return {"message": "Email queued for retry"}

@router.post("/bulk/retry-failed")
async def bulk_retry_failed_emails(
    request: BulkRetryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    from sqlalchemy import select
    
    batch_size = min(request.batch_size, 100)
    
    stmt = select(EmailLog).where(
        EmailLog.status == EmailStatus.FAILED,
        EmailLog.is_deleted == False
    ).limit(batch_size)
    
    result = await db.execute(stmt)
    failed_logs = result.scalars().all()
    
    count = 0
    for log in failed_logs:
        log.status = EmailStatus.PENDING
        log.retry_count = 0
        await db.commit() # commit each to ensure state is locked
        
        send_email_task.delay(
            to_email=log.recipient_email,
            subject=log.subject,
            html_body=log.html_body,
            email_log_id=str(log.id)
        )
        count += 1
        await asyncio.sleep(0.1) # concurrency guard
        
    return {"message": f"Successfully queued {count} emails for retry"}

@router.delete("/bulk/delete-old")
async def bulk_delete_old_logs(
    days: int = Query(30, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    stmt = update(EmailLog).where(
        EmailLog.created_at < cutoff_date,
        EmailLog.is_deleted == False
    ).values(is_deleted=True)
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {"message": f"Successfully deleted {result.rowcount} old logs"}

@router.post("/bulk/archive")
async def bulk_archive_logs(
    current_user: User = Depends(get_current_admin)
):
    # For Phase 1, just a placeholder.
    return {"message": "Archive functionality will be implemented in Phase 2"}
