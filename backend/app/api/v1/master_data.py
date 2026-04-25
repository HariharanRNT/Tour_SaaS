from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user, get_current_agent, get_current_admin
from app.models import User, TripStyle, ActivityTag, ActivityCategory, UserRole
from app.schemas.packages import (
    TripStyleCreate, TripStyleResponse,
    ActivityTagCreate, ActivityTagResponse,
    ActivityCategoryCreate, ActivityCategoryResponse
)
from app.api.deps import get_current_domain
from app.models import Agent

router = APIRouter()

# -----------------------------------------------------------------------------
# TRIP STYLES
# -----------------------------------------------------------------------------

@router.get("/public/trip-styles", response_model=List[TripStyleResponse])
async def get_public_trip_styles(
    domain: str = Depends(get_current_domain),
    db: AsyncSession = Depends(get_db)
):
    # Find Agent by domain
    agent_stmt = select(Agent).where(Agent.domain == domain)
    agent_result = await db.execute(agent_stmt)
    agent = agent_result.scalar_one_or_none()
    
    agent_id = agent.user_id if agent else None
    
    query = select(TripStyle).where(
        and_(
            TripStyle.is_active == True,
            or_(TripStyle.agent_id == None, TripStyle.agent_id == agent_id)
        )
    ).order_by(
        TripStyle.agent_id.isnot(None),
        TripStyle.name
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/agent/trip-styles", response_model=List[TripStyleResponse])
async def get_agent_trip_styles(
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(TripStyle).where(
        and_(
            TripStyle.is_active == True,
            or_(TripStyle.agent_id == None, TripStyle.agent_id == agent_id)
        )
    ).order_by(
        TripStyle.agent_id.isnot(None),  # NULLs (global defaults) first
        TripStyle.name
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/agent/trip-styles", response_model=TripStyleResponse)
async def create_agent_trip_style(
    data: TripStyleCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    
    # Check for duplicate
    query = select(TripStyle).where(
        and_(
            func.lower(TripStyle.name) == func.lower(data.name),
            or_(TripStyle.agent_id == None, TripStyle.agent_id == agent_id)
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Trip style with this name already exists")
        
    new_style = TripStyle(
        name=data.name,
        icon=data.icon,
        created_by="AGENT",
        agent_id=agent_id
    )
    db.add(new_style)
    await db.commit()
    await db.refresh(new_style)
    return new_style


@router.put("/agent/trip-styles/{style_id}", response_model=TripStyleResponse)
async def update_agent_trip_style(
    style_id: UUID,
    data: TripStyleCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(TripStyle).where(TripStyle.id == style_id)
    result = await db.execute(query)
    style = result.scalars().first()
    
    if not style:
        raise HTTPException(status_code=404, detail="Trip style not found")
    if str(style.agent_id) != str(agent_id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this trip style")
        
    style.name = data.name
    style.icon = data.icon
    
    await db.commit()
    await db.refresh(style)
    return style


@router.delete("/agent/trip-styles/{style_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_trip_style(
    style_id: UUID,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(TripStyle).where(TripStyle.id == style_id)
    result = await db.execute(query)
    style = result.scalars().first()
    
    if not style:
        raise HTTPException(status_code=404, detail="Trip style not found")
        
    if style.agent_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete a global default trip style")
        
    if str(style.agent_id) != str(agent_id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip style")
        
    await db.delete(style)
    await db.commit()


@router.get("/admin/trip-styles", response_model=List[TripStyleResponse])
async def get_admin_trip_styles(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TripStyle).order_by(TripStyle.agent_id.isnot(None), TripStyle.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/admin/trip-styles", response_model=TripStyleResponse)
async def create_admin_trip_style(
    data: TripStyleCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TripStyle).where(
        and_(
            func.lower(TripStyle.name) == func.lower(data.name),
            TripStyle.agent_id == None
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Global trip style with this name already exists")
        
    new_style = TripStyle(
        name=data.name,
        icon=data.icon,
        created_by="ADMIN",
        agent_id=None
    )
    db.add(new_style)
    await db.commit()
    await db.refresh(new_style)
    return new_style


@router.put("/admin/trip-styles/{style_id}", response_model=TripStyleResponse)
async def update_admin_trip_style(
    style_id: UUID,
    data: dict,  # allow partial updates
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TripStyle).where(TripStyle.id == style_id)
    result = await db.execute(query)
    style = result.scalars().first()
    
    if not style:
        raise HTTPException(status_code=404, detail="Trip style not found")
        
    if "name" in data:
        style.name = data["name"]
    if "icon" in data:
        style.icon = data["icon"]
    if "is_active" in data:
        style.is_active = data["is_active"]
        
    await db.commit()
    await db.refresh(style)
    return style


@router.delete("/admin/trip-styles/{style_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_trip_style(
    style_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(TripStyle).where(TripStyle.id == style_id)
    result = await db.execute(query)
    style = result.scalars().first()
    
    if not style:
        raise HTTPException(status_code=404, detail="Trip style not found")
        
    await db.delete(style)
    await db.commit()


# -----------------------------------------------------------------------------
# ACTIVITY TAGS
# -----------------------------------------------------------------------------

@router.get("/public/activity-tags", response_model=List[ActivityTagResponse])
async def get_public_activity_tags(
    domain: str = Depends(get_current_domain),
    db: AsyncSession = Depends(get_db)
):
    # Find Agent by domain
    agent_stmt = select(Agent).where(Agent.domain == domain)
    agent_result = await db.execute(agent_stmt)
    agent = agent_result.scalar_one_or_none()
    
    agent_id = agent.user_id if agent else None
    
    query = select(ActivityTag).where(
        and_(
            ActivityTag.is_active == True,
            or_(ActivityTag.agent_id == None, ActivityTag.agent_id == agent_id)
        )
    ).order_by(
        ActivityTag.agent_id.isnot(None),
        ActivityTag.name
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/agent/activity-tags", response_model=List[ActivityTagResponse])
async def get_agent_activity_tags(
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(ActivityTag).where(
        and_(
            ActivityTag.is_active == True,
            or_(ActivityTag.agent_id == None, ActivityTag.agent_id == agent_id)
        )
    ).order_by(
        ActivityTag.agent_id.isnot(None),
        ActivityTag.name
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/agent/activity-tags", response_model=ActivityTagResponse)
async def create_agent_activity_tag(
    data: ActivityTagCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    
    query = select(ActivityTag).where(
        and_(
            func.lower(ActivityTag.name) == func.lower(data.name),
            or_(ActivityTag.agent_id == None, ActivityTag.agent_id == agent_id)
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Activity tag with this name already exists")
        
    new_tag = ActivityTag(
        name=data.name,
        icon=data.icon,
        category_id=data.category_id,
        created_by="AGENT",
        agent_id=agent_id
    )
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return new_tag


@router.put("/agent/activity-tags/{tag_id}", response_model=ActivityTagResponse)
async def update_agent_activity_tag(
    tag_id: UUID,
    data: ActivityTagCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(ActivityTag).where(ActivityTag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalars().first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Activity tag not found")
    if str(tag.agent_id) != str(agent_id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this activity tag")
        
    tag.name = data.name
    tag.icon = data.icon
    tag.category_id = data.category_id
    
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/agent/activity-tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent_activity_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(ActivityTag).where(ActivityTag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalars().first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Activity tag not found")
        
    if tag.agent_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete a global default activity tag")
        
    if str(tag.agent_id) != str(agent_id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this activity tag")
        
    await db.delete(tag)
    await db.commit()


@router.get("/admin/activity-tags", response_model=List[ActivityTagResponse])
async def get_admin_activity_tags(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityTag).order_by(ActivityTag.agent_id.isnot(None), ActivityTag.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/admin/activity-tags", response_model=ActivityTagResponse)
async def create_admin_activity_tag(
    data: ActivityTagCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityTag).where(
        and_(
            func.lower(ActivityTag.name) == func.lower(data.name),
            ActivityTag.agent_id == None
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Global activity tag with this name already exists")
        
    new_tag = ActivityTag(
        name=data.name,
        icon=data.icon,
        category_id=data.category_id,
        created_by="ADMIN",
        agent_id=None
    )
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return new_tag


@router.put("/admin/activity-tags/{tag_id}", response_model=ActivityTagResponse)
async def update_admin_activity_tag(
    tag_id: UUID,
    data: dict,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityTag).where(ActivityTag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalars().first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Activity tag not found")
        
    if "name" in data:
        tag.name = data["name"]
    if "icon" in data:
        tag.icon = data["icon"]
    if "category_id" in data:
        tag.category_id = data["category_id"]
    if "is_active" in data:
        tag.is_active = data["is_active"]
        
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/admin/activity-tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_activity_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityTag).where(ActivityTag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalars().first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Activity tag not found")
        
    await db.delete(tag)
    await db.commit()


# -----------------------------------------------------------------------------
# ACTIVITY CATEGORIES
# -----------------------------------------------------------------------------

@router.get("/agent/activity-categories", response_model=List[ActivityCategoryResponse])
async def get_agent_activity_categories(
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(ActivityCategory).where(
        and_(
            ActivityCategory.is_active == True,
            or_(ActivityCategory.agent_id == None, ActivityCategory.agent_id == agent_id)
        )
    ).order_by(
        ActivityCategory.agent_id.isnot(None),
        ActivityCategory.name
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/agent/activity-categories", response_model=ActivityCategoryResponse)
async def create_agent_activity_category(
    data: ActivityCategoryCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    
    query = select(ActivityCategory).where(
        and_(
            func.lower(ActivityCategory.name) == func.lower(data.name),
            or_(ActivityCategory.agent_id == None, ActivityCategory.agent_id == agent_id)
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Activity category with this name already exists")
        
    new_cat = ActivityCategory(
        name=data.name,
        created_by="AGENT",
        agent_id=agent_id
    )
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat


@router.put("/agent/activity-categories/{cat_id}", response_model=ActivityCategoryResponse)
async def update_agent_activity_category(
    cat_id: UUID,
    data: ActivityCategoryCreate,
    current_user: User = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    agent_id = current_user.agent_id
    query = select(ActivityCategory).where(ActivityCategory.id == cat_id)
    result = await db.execute(query)
    cat = result.scalars().first()
    
    if not cat:
        raise HTTPException(status_code=404, detail="Activity category not found")
    if str(cat.agent_id) != str(agent_id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this activity category")
        
    cat.name = data.name
    
    await db.commit()
    await db.refresh(cat)
    return cat


@router.get("/admin/activity-categories", response_model=List[ActivityCategoryResponse])
async def get_admin_activity_categories(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityCategory).order_by(ActivityCategory.agent_id.isnot(None), ActivityCategory.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/admin/activity-categories", response_model=ActivityCategoryResponse)
async def create_admin_activity_category(
    data: ActivityCategoryCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityCategory).where(
        and_(
            func.lower(ActivityCategory.name) == func.lower(data.name),
            ActivityCategory.agent_id == None
        )
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Global activity category with this name already exists")
        
    new_cat = ActivityCategory(
        name=data.name,
        created_by="ADMIN",
        agent_id=None
    )
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat


@router.put("/admin/activity-categories/{cat_id}", response_model=ActivityCategoryResponse)
async def update_admin_activity_category(
    cat_id: UUID,
    data: dict,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityCategory).where(ActivityCategory.id == cat_id)
    result = await db.execute(query)
    cat = result.scalars().first()
    
    if not cat:
        raise HTTPException(status_code=404, detail="Activity category not found")
        
    if "name" in data:
        cat.name = data["name"]
    if "is_active" in data:
        cat.is_active = data["is_active"]
        
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/admin/activity-categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_activity_category(
    cat_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityCategory).where(ActivityCategory.id == cat_id)
    result = await db.execute(query)
    cat = result.scalars().first()
    
    if not cat:
        raise HTTPException(status_code=404, detail="Activity category not found")
        
    await db.delete(cat)
    await db.commit()
