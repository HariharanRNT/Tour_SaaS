from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Agent
from app.api.deps import get_current_agent
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class AgentSettingsUpdate(BaseModel):
    currency: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None

class AgentSettingsResponse(BaseModel):
    currency: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    # Never return password!

@router.get("", response_model=AgentSettingsResponse)
async def get_agent_settings(
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get current agent settings"""
    agent_profile = current_agent.agent_profile
    if not agent_profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
        
    return AgentSettingsResponse(
        currency=agent_profile.currency or "INR",
        smtp_host=agent_profile.smtp_host,
        smtp_port=agent_profile.smtp_port,
        smtp_user=agent_profile.smtp_user,
        smtp_from_email=agent_profile.smtp_from_email
    )

@router.put("", response_model=AgentSettingsResponse)
async def update_agent_settings(
    settings: AgentSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Update agent settings"""
    agent_profile = current_agent.agent_profile
    if not agent_profile:
        # Should ideally create if missing, but agent creation handles this usually
        raise HTTPException(status_code=404, detail="Agent profile not found")

    if settings.currency is not None:
        agent_profile.currency = settings.currency
    
    if settings.smtp_host is not None:
        agent_profile.smtp_host = settings.smtp_host
    if settings.smtp_port is not None:
        agent_profile.smtp_port = settings.smtp_port
    if settings.smtp_user is not None:
        agent_profile.smtp_user = settings.smtp_user
    if settings.smtp_password is not None:
        # In a real app, encrypt this! For now storing plainly as requested/MVP.
        # Ideally: agent_profile.smtp_password = encrypt(settings.smtp_password)
        if settings.smtp_password.strip(): # Only update if not empty
             agent_profile.smtp_password = settings.smtp_password
    if settings.smtp_from_email is not None:
        agent_profile.smtp_from_email = settings.smtp_from_email
        
    await db.commit()
    await db.refresh(agent_profile)
    
    return AgentSettingsResponse(
        currency=agent_profile.currency,
        smtp_host=agent_profile.smtp_host,
        smtp_port=agent_profile.smtp_port,
        smtp_user=agent_profile.smtp_user,
        smtp_from_email=agent_profile.smtp_from_email
    )
