import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user
from app.models import User, UserRole
from app.models.email_log import EmailLog, EmailStatus, SenderType
from app.services.email_log_service import EmailLogService
from app.tasks.email_tasks import send_email_task
from sqlalchemy import update
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()

class EmailLogResponse(BaseModel):
    id: UUID
    sender_type: str
    sender_id: Optional[UUID] = None
    email_type: str
    recipient_email: str
    subject: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    sent_time: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/stats")
async def get_agent_email_log_stats(
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.AGENT, UserRole.SUB_USER]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    sender_id = current_user.sub_user_profile.agent_id if (current_user.role == UserRole.SUB_USER and getattr(current_user, 'sub_user_profile', None)) else current_user.id
    
    # We also need the agent's email. For SUB_USER, we should get the parent agent's email? 
    # Or just use current_user.email?
    # Let's use current_user.email for now.
    agent_email = current_user.email

    stats = await EmailLogService.get_stats(
        sender_type=SenderType.AGENT, 
        sender_id=sender_id,
        agent_email=agent_email
    )
    return stats

@router.get("/")
async def list_agent_email_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.AGENT, UserRole.SUB_USER]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    sender_id = current_user.sub_user_profile.agent_id if (current_user.role == UserRole.SUB_USER and getattr(current_user, 'sub_user_profile', None)) else current_user.id
    agent_email = current_user.email
    
    logs, total = await EmailLogService.get_logs(
        page=page, 
        limit=limit, 
        status=status, 
        search=search,
        sender_type=SenderType.AGENT,
        sender_id=sender_id,
        agent_email=agent_email
    )
    return {
        "data": logs,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{log_id}")
async def get_agent_email_log_details(
    log_id: UUID,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.AGENT, UserRole.SUB_USER]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    log = await EmailLogService.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
        
    sender_id = current_user.sub_user_profile.agent_id if (current_user.role == UserRole.SUB_USER and getattr(current_user, 'sub_user_profile', None)) else current_user.id
    agent_email = current_user.email
    
    if log.sender_id != sender_id and log.recipient_email != agent_email:
        raise HTTPException(status_code=403, detail="Not authorized to view this email log")
        
    return log
