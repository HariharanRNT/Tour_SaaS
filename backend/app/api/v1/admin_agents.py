"""Admin API endpoints for agent management"""

import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import User, UserRole, Agent, Customer
from app.api.deps import get_current_admin
from app.core.security import get_password_hash
from app.schemas import UserCreate, UserResponse, UserUpdate, BulkDeleteRequest, BulkStatusUpdateRequest, AdminAgentCreate

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/agents", response_model=List[UserResponse])
async def list_agents(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = "all",
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """List all agents with optional status filter"""
    from sqlalchemy.orm import selectinload
    from app.models import ApprovalStatus
    
    stmt = select(User).join(Agent).where(User.role == UserRole.AGENT)
    
    if status == "pending":
        stmt = stmt.where(User.approval_status == ApprovalStatus.PENDING)
    elif status == "approved":
        stmt = stmt.where(User.approval_status == ApprovalStatus.APPROVED)
    elif status == "rejected":
        stmt = stmt.where(User.approval_status == ApprovalStatus.REJECTED)
    elif status == "active":
        stmt = stmt.where(User.is_active == True)
    elif status == "inactive":
        stmt = stmt.where(User.is_active == False)

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
    user_data: AdminAgentCreate,
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
            detail="this email has already registered"
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


@router.post("/agents/bulk-delete")
async def bulk_delete_agents(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Bulk delete agent accounts. Fails if any agent has packages."""
    from app.models import Package
    from sqlalchemy import update

    # 1. Fetch all agents
    stmt = select(User).where(User.id.in_(request.ids), User.role == UserRole.AGENT)
    result = await db.execute(stmt)
    agents = result.scalars().all()
    
    found_ids = {agent.id for agent in agents}
    missing_ids = [str(id) for id in request.ids if id not in found_ids]
    
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Some agents not found: {', '.join(missing_ids)}"
        )

    # 2. Check for associated Packages for ANY of the agents
    pkg_stmt = select(Package).where(Package.created_by.in_(request.ids)).limit(1)
    pkg_result = await db.execute(pkg_stmt)
    if pkg_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agents with existing packages. Please delete or reassign packages first."
        )

    # 3. Check for associated Enquiries
    from app.models import Enquiry
    enq_stmt = select(Enquiry).where(Enquiry.agent_id.in_(request.ids)).limit(1)
    enq_result = await db.execute(enq_stmt)
    if enq_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agents with associated enquiries. Please process or delete enquiries first."
        )

    # 4. Check for associated Bookings
    from app.models import Booking
    from sqlalchemy import or_
    book_stmt = select(Booking).where(
        or_(Booking.agent_id.in_(request.ids), Booking.booked_by_user_id.in_(request.ids))
    ).limit(1)
    book_result = await db.execute(book_stmt)
    if book_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agents with existing bookings. Please manage or archive bookings first."
        )

    # 5. Unlink Customers (Set agent_id = None)
    unlink_stmt = update(Customer).where(Customer.agent_id.in_(request.ids)).values(agent_id=None)
    await db.execute(unlink_stmt)
    
    # 6. Delete Agents
    for agent in agents:
        await db.delete(agent)
    
    await db.commit()
    return {"message": f"Successfully deleted {len(agents)} agents"}


@router.post("/agents/bulk-status")
async def bulk_update_agents_status(
    request: BulkStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Bulk enable or disable agent accounts"""
    from sqlalchemy import update
    
    stmt = update(User).where(
        User.id.in_(request.ids), 
        User.role == UserRole.AGENT
    ).values(is_active=request.is_active)
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {"message": f"Successfully updated status for {result.rowcount} agents"}


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


@router.patch("/agents/{agent_id}/approve", response_model=UserResponse)
async def approve_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Approve a self-registered agent"""
    from app.models import ApprovalStatus
    from sqlalchemy.orm import selectinload
    
    stmt = select(User).where(User.id == agent_id, User.role == UserRole.AGENT).options(
        selectinload(User.agent_profile)
    )
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.approval_status = ApprovalStatus.APPROVED
    agent.is_active = True
    agent.email_verified = True # Trusted after admin approval
    
    await db.commit()
    await db.refresh(agent)
    
    # Trigger approval email
    try:
        from app.services.agent_notification_service import AgentNotificationService
        await AgentNotificationService.send_approval_email(agent)
    except Exception as e:
        logger.error(f"Failed to send approval email: {e}")
    
    return UserResponse.model_validate(agent)


@router.patch("/agents/{agent_id}/reject", response_model=UserResponse)
async def reject_agent(
    agent_id: UUID,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Reject a self-registered agent"""
    from app.models import ApprovalStatus
    from sqlalchemy.orm import selectinload
    
    stmt = select(User).where(User.id == agent_id, User.role == UserRole.AGENT).options(
        selectinload(User.agent_profile)
    )
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.approval_status = ApprovalStatus.REJECTED
    agent.is_active = False
    
    await db.commit()
    await db.refresh(agent)
    
    # Trigger rejection email
    try:
        from app.services.agent_notification_service import AgentNotificationService
        await AgentNotificationService.send_rejection_email(agent)
    except Exception as e:
        logger.error(f"Failed to send rejection email: {e}")
    
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

    # 3. Check for associated Enquiries
    from app.models import Enquiry
    enq_stmt = select(Enquiry).where(Enquiry.agent_id == agent_id).limit(1)
    enq_result = await db.execute(enq_stmt)
    if enq_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agent with associated enquiries. Please process or delete enquiries first."
        )

    # 4. Check for associated Bookings
    from app.models import Booking
    from sqlalchemy import or_
    book_stmt = select(Booking).where(
        or_(Booking.agent_id == agent_id, Booking.booked_by_user_id == agent_id)
    ).limit(1)
    book_result = await db.execute(book_stmt)
    if book_result.scalar_one_or_none():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete agent with existing bookings. Please manage or archive bookings first."
        )

    # 5. Unlink Customers (Set agent_id = None)
    # We do this manually because SQLAlchemy cascade might not be set for self-referential
    from sqlalchemy import update
    unlink_stmt = update(Customer).where(Customer.agent_id == agent_id).values(agent_id=None)
    await db.execute(unlink_stmt)
    
    # 7. Delete Agent (Bookings cascade automatically)
    await db.delete(agent)
    await db.commit()


@router.put("/agents/{agent_id}", response_model=UserResponse)
async def update_agent(
    agent_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Update an agent's details"""
    # 1. Fetch Agent with all profiles
    from sqlalchemy.orm import selectinload
    stmt = select(User).where(User.id == agent_id, User.role == UserRole.AGENT).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    agent_user = result.scalar_one_or_none()
    
    if not agent_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
        
    agent_profile = agent_user.agent_profile
    if not agent_profile:
        # Should not happen for valid agents, but good to handle
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )

    # 2. Update User Fields
    if user_data.is_active is not None:
        agent_user.is_active = user_data.is_active
        
    # 3. Update Agent Profile Fields
    # Personal
    if user_data.first_name is not None: agent_profile.first_name = user_data.first_name
    if user_data.last_name is not None: agent_profile.last_name = user_data.last_name
    if user_data.phone is not None: agent_profile.phone = user_data.phone
    
    # Agency
    if user_data.agency_name is not None: agent_profile.agency_name = user_data.agency_name
    if user_data.company_legal_name is not None: agent_profile.company_legal_name = user_data.company_legal_name
    if user_data.domain is not None: agent_profile.domain = user_data.domain
    if user_data.business_address is not None: agent_profile.business_address = user_data.business_address
    if user_data.city is not None: agent_profile.city = user_data.city
    if user_data.state is not None: agent_profile.state = user_data.state
    if user_data.country is not None: agent_profile.country = user_data.country
    
    # Financial
    if user_data.gst_no is not None: agent_profile.gst_no = user_data.gst_no
    if user_data.tax_id is not None: agent_profile.tax_id = user_data.tax_id
    if user_data.currency is not None: agent_profile.currency = user_data.currency
    if user_data.commission_type is not None: agent_profile.commission_type = user_data.commission_type
    if user_data.commission_value is not None: agent_profile.commission_value = user_data.commission_value

    await db.commit()
    await db.refresh(agent_user)
    
    return UserResponse.model_validate(agent_user)
