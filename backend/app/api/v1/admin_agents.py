"""Admin API endpoints for agent management"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import User, UserRole, Agent, Customer
from app.api.deps import get_current_admin
from app.core.security import get_password_hash
from app.schemas import UserCreate, UserResponse

router = APIRouter()

@router.get("/agents", response_model=List[UserResponse])
async def list_agents(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """List all agents"""
    from sqlalchemy.orm import selectinload
    stmt = select(User).join(Agent).where(User.role == UserRole.AGENT)
    stmt = stmt.offset(skip).limit(limit).order_by(User.created_at.desc()).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    
    result = await db.execute(stmt)
    agents = result.scalars().all()
    
    return [UserResponse.model_validate(agent) for agent in agents]


@router.post("/agents", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Create a new agent"""
    # Check if user already exists
    stmt = select(User).where(User.email == user_data.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create agent user
    new_agent_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.AGENT,
        is_active=True,
        email_verified=True # Auto-verify agents created by admin
    )
    db.add(new_agent_user)
    await db.flush()

    new_agent_profile = Agent(
        user_id=new_agent_user.id,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        domain=user_data.domain or user_data.email.split('@')[-1].lower(),
        # New Fields
        agency_name=user_data.agency_name,
        company_legal_name=user_data.company_legal_name,
        business_address=user_data.business_address,
        city=user_data.city,
        country=user_data.country,
        gst_no=user_data.gst_no,
        tax_id=user_data.tax_id,
        currency=user_data.currency,
        commission_type=user_data.commission_type,
        commission_value=user_data.commission_value
    )
    db.add(new_agent_profile)
    
    await db.commit()
    await db.commit()
    
    # Re-fetch user with eager loading to ensure proxy properties work for UserResponse
    from sqlalchemy.orm import selectinload
    stmt = select(User).where(User.id == new_agent_user.id).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    refreshed_user = result.scalar_one()
    
    return UserResponse.model_validate(refreshed_user)


@router.patch("/agents/{agent_id}/status")
async def toggle_agent_status(
    agent_id: UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Enable or disable an agent account"""
    from sqlalchemy.orm import selectinload
    stmt = select(User).where(User.id == agent_id, User.role == UserRole.AGENT).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.is_active = is_active
    await db.commit()
    await db.refresh(agent)
    
    return UserResponse.model_validate(agent)


@router.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Delete an agent account. Fails if agent has packages."""
    # 1. Fetch Agent
    stmt = select(User).where(User.id == agent_id, User.role == UserRole.AGENT)
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
        
    # 2. Check for associated Packages
    from app.models import Package
    pkg_stmt = select(Package).where(Package.created_by == agent_id).limit(1)
    pkg_result = await db.execute(pkg_stmt)
    if pkg_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agent with existing packages. Please delete or reassign packages first."
        )

    # 3. Unlink Customers (Set agent_id = None)
    # We do this manually because SQLAlchemy cascade might not be set for self-referential
    from sqlalchemy import update
    unlink_stmt = update(Customer).where(Customer.agent_id == agent_id).values(agent_id=None)
    await db.execute(unlink_stmt)
    
    # 4. Delete Agent (Bookings cascade automatically)
    await db.delete(agent)
    await db.commit()
