from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Agent, AgentTheme, UserRole
from app.schemas.theme import AgentThemeCreate, AgentThemeUpdate, AgentThemeResponse
from app.core.security import get_current_user, get_current_user_optional

from datetime import datetime

router = APIRouter(prefix="/theme", tags=["theme"])

async def get_or_create_draft(agent_id: UUID, db: AsyncSession) -> AgentTheme:
    """Helper to get existing draft or create one from live/defaults"""
    # 1. Try to get existing DRAFT
    query = select(AgentTheme).where(
        AgentTheme.agent_id == agent_id,
        AgentTheme.version_type == "draft"
    )
    result = await db.execute(query)
    draft = result.scalar_one_or_none()
    
    if draft:
        return draft
        
    # 2. If no draft, try to get LIVE to clone from
    query = select(AgentTheme).where(
        AgentTheme.agent_id == agent_id,
        AgentTheme.version_type == "live"
    )
    result = await db.execute(query)
    live = result.scalar_one_or_none()
    
    # 3. Create draft
    if live:
        # Clone live into draft
        exclude = {'id', 'agent_id', 'version_type', 'created_at', 'updated_at', '_sa_instance_state'}
        draft_data = {c.name: getattr(live, c.name) for c in live.__table__.columns if c.name not in exclude}
        draft = AgentTheme(**draft_data, version_type="draft", agent_id=agent_id)
    else:
        # Create from defaults
        draft = AgentTheme(agent_id=agent_id, version_type="draft")
        
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft

@router.get("/agent", response_model=AgentThemeResponse)
async def get_agent_theme(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the theme configuration for the current agent.
    Always returns the DRAFT version (clones from LIVE if needed).
    """
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can access this endpoint")
         
    if not current_user.agent_profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
        
    return await get_or_create_draft(current_user.agent_profile.id, db)

@router.put("/agent", response_model=AgentThemeResponse)
async def update_agent_theme(
    theme_update: AgentThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the DRAFT theme configuration for the current agent.
    """
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can update theme")
         
    if not current_user.agent_profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
        
    draft = await get_or_create_draft(current_user.agent_profile.id, db)
    
    # Update fields
    update_data = theme_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(draft, key, value)
        
    await db.commit()
    await db.refresh(draft)
    return draft

@router.post("/publish", response_model=AgentThemeResponse)
async def publish_theme(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Promote DRAFT to LIVE and snapshot old LIVE to PREVIOUS.
    """
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can publish theme")
    
    agent_id = current_user.agent_profile.id
    
    # 1. Get DRAFT
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "draft")
    result = await db.execute(query)
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise HTTPException(status_code=400, detail="No draft theme to publish")
        
    # 2. Handle LIVE -> PREVIOUS
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "live")
    result = await db.execute(query)
    current_live = result.scalar_one_or_none()
    
    if current_live:
        # Check if PREVIOUS exists, delete it first
        query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "previous")
        result = await db.execute(query)
        old_previous = result.scalar_one_or_none()
        if old_previous:
            await db.delete(old_previous)
            
        # Promote LIVE to PREVIOUS
        current_live.version_type = "previous"
        current_live.updated_at = datetime.now()
    
    # 3. Promote DRAFT to LIVE
    draft.version_type = "live"
    draft.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(draft)
    return draft

@router.post("/restore", response_model=AgentThemeResponse)
async def restore_theme(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restore PREVIOUS theme to LIVE.
    """
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can restore theme")
    
    agent_id = current_user.agent_profile.id
    
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "previous")
    result = await db.execute(query)
    previous = result.scalar_one_or_none()
    
    if not previous:
        raise HTTPException(status_code=400, detail="No previous theme version found to restore")
        
    # 1. Delete current LIVE
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "live")
    result = await db.execute(query)
    current_live = result.scalar_one_or_none()
    if current_live:
        await db.delete(current_live)
        
    # 2. Restore PREVIOUS to LIVE
    previous.version_type = "live"
    previous.updated_at = datetime.now()
    
    # 3. Delete current DRAFT (to ensure next edit starts fresh from restored live)
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id, AgentTheme.version_type == "draft")
    result = await db.execute(query)
    draft = result.scalar_one_or_none()
    if draft:
        await db.delete(draft)
        
    await db.commit()
    await db.refresh(previous)
    return previous

@router.get("/public", response_model=AgentThemeResponse)
async def get_public_theme(
    domain: str = Query(..., description="The domain of the agent"),
    preview: bool = Query(False),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the public theme configuration for a specific agent domain.
    Supports preview mode for the owning agent.
    """
    # Find agent by domain
    query = select(Agent).where(Agent.domain == domain)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()
    
    if not agent:
        # ... (default theme logic) ...
        return AgentThemeResponse(
            id=UUID("00000000-0000-0000-0000-000000000000"),
            agent_id=UUID("00000000-0000-0000-0000-000000000000"),
            created_at=datetime.now(),
            version_type="live",
            primary_color="hsl(221.2 83.2% 53.3%)",
            secondary_color="hsl(210 40% 96.1%)",
            accent_color="hsl(210 40% 96.1%)",
            background_color="hsl(0 0% 100%)",
            foreground_color="hsl(222.2 84% 4.9%)",
            font_family="Inter",
            radius="0.5rem",
            button_radius="0.5rem",
            card_radius="0.75rem",
            hero_background_type="image",
            section_spacing="comfortable"
        )
        
    # 1. Handle Preview Mode
    if preview and current_user and current_user.agent_profile and current_user.agent_profile.id == agent.id:
        query = select(AgentTheme).where(AgentTheme.agent_id == agent.id, AgentTheme.version_type == "draft")
        result = await db.execute(query)
        draft = result.scalar_one_or_none()
        if draft:
            return draft

    # 2. Regular LIVE Theme
    query = select(AgentTheme).where(AgentTheme.agent_id == agent.id, AgentTheme.version_type == "live")
    result = await db.execute(query)
    live = result.scalar_one_or_none()
    
    if not live:
        # Return default theme structure but don't save to DB
        return AgentThemeResponse(
            id=agent.id, # Placeholder
            agent_id=agent.id,
            created_at=datetime.now(),
            version_type="live",
            primary_color="hsl(221.2 83.2% 53.3%)",
            secondary_color="hsl(210 40% 96.1%)",
            accent_color="hsl(210 40% 96.1%)",
            background_color="hsl(0 0% 100%)",
            foreground_color="hsl(222.2 84% 4.9%)",
            font_family="Inter",
            radius="0.5rem",
            button_radius="0.5rem",
            card_radius="0.75rem",
            hero_background_type="image",
            section_spacing="comfortable"
        )
        
    return live

@router.delete("/agent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_theme(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reset theme by deleting DRAFT and LIVE.
    """
    if current_user.role != UserRole.AGENT:
         raise HTTPException(status_code=403, detail="Only agents can reset theme")
         
    if not current_user.agent_profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")
        
    agent_id = current_user.agent_profile.id
    
    # Delete all versions
    query = select(AgentTheme).where(AgentTheme.agent_id == agent_id)
    result = await db.execute(query)
    themes = result.scalars().all()
    
    for theme in themes:
        await db.delete(theme)
        
    await db.commit()
    return None
