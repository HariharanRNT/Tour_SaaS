"""Agent Customer Management API routes"""
import secrets
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, UserRole, Customer
from app.schemas import UserCreate, UserResponse, AgentQuickCreateCustomer, CustomerSearchResult
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException
from app.api.deps import get_current_agent, check_permission

router = APIRouter()

AGENT_ROLES = [UserRole.AGENT, UserRole.SUB_USER]


def _resolve_agent_id(current_user: User) -> Optional[str]:
    """Return the parent agent's user_id regardless of whether caller is AGENT or SUB_USER."""
    if current_user.role == UserRole.AGENT:
        return current_user.id
    if current_user.role == UserRole.SUB_USER:
        if current_user.sub_user_profile and current_user.sub_user_profile.agent_id:
            return current_user.sub_user_profile.agent_id
    return None


def _generate_temp_password(length: int = 12) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ─────────────────────────────────────────────────────────────────────────────
# Search customers (used by the AgentCustomerSelectorModal)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[CustomerSearchResult])
async def search_customers(
    q: str = Query("", description="Search term: name or email"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("customers", "view")),
):
    """Search customers belonging to the agent by name or email."""
    agent_id = _resolve_agent_id(current_user)
    if not agent_id:
        raise HTTPException(status_code=403, detail="Could not resolve parent agent.")

    search = f"%{q.strip()}%"
    query = (
        select(User)
        .join(Customer, User.id == Customer.user_id)
        .where(
            Customer.agent_id == agent_id,
            User.role == UserRole.CUSTOMER,
            or_(
                User.email.ilike(search),
                Customer.first_name.ilike(search),
                Customer.last_name.ilike(search),
            ) if q.strip() else True,
        )
        .options(
            selectinload(User.customer_profile),
        )
        .limit(30)
    )

    result = await db.execute(query)
    customers = result.scalars().all()

    return [
        CustomerSearchResult(
            id=c.id,
            first_name=c.customer_profile.first_name if c.customer_profile else "",
            last_name=c.customer_profile.last_name if c.customer_profile else "",
            email=c.email,
            phone=c.customer_profile.phone if c.customer_profile else None,
        )
        for c in customers
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Quick-create a customer (from the AgentCustomerSelectorModal)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/quick-create", response_model=CustomerSearchResult, status_code=status.HTTP_201_CREATED)
async def quick_create_customer(
    data: AgentQuickCreateCustomer,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("customers", "edit")),
):
    """
    Agent quick-creates a CUSTOMER account during the booking flow.
    Auto-generates a temp password; optionally emails credentials to the customer.
    """
    agent_id = _resolve_agent_id(current_user)
    if not agent_id:
        raise HTTPException(status_code=403, detail="Could not resolve parent agent.")

    # Check email not already registered
    result = await db.execute(select(User).where(User.email == data.email))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.role == UserRole.CUSTOMER:
            raise HTTPException(
                status_code=409,
                detail="Customer already exists. Please search and select them."
            )
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Email is already registered as {existing.role.value}. Cannot create as customer."
            )

    # Generate temp password
    temp_password = _generate_temp_password()

    # Create user
    new_user = User(
        email=data.email,
        password_hash=get_password_hash(temp_password),
        role=UserRole.CUSTOMER,
        is_active=True,
        email_verified=True,  # Created by agent — treat as verified
    )
    db.add(new_user)
    await db.flush()

    # Create customer profile
    customer_profile = Customer(
        user_id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        agent_id=agent_id,
    )
    db.add(customer_profile)
    await db.commit()

    # Optionally send credentials email
    if data.send_credentials:
        try:
            from app.services.email_service import EmailService
            from app.models import Agent
            from sqlalchemy.orm import selectinload as sil

            # Fetch agent for SMTP config
            agent_stmt = select(User).where(User.id == agent_id).options(
                sil(User.agent_profile).selectinload(Agent.smtp_settings)
            )
            agent_res = await db.execute(agent_stmt)
            agent_user = agent_res.scalar_one_or_none()

            smtp_config = None
            agency_name = "TourSaaS"
            if agent_user and agent_user.agent_profile:
                ap = agent_user.agent_profile
                agency_name = ap.agency_name or agency_name
                if ap.smtp_settings:
                    from app.utils.crypto import decrypt_value
                    s = ap.smtp_settings
                    smtp_config = {
                        "host": s.host,
                        "port": s.port,
                        "user": s.username,
                        "password": decrypt_value(s.password),
                        "from_email": s.from_email,
                        "from_name": s.from_name,
                        "encryption_type": s.encryption_type,
                    }

            subject = f"Your {agency_name} Account Has Been Created"
            body = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">{agency_name}</h2>
                <p>Hello {data.first_name},</p>
                <p>An account has been created for you by your travel agent. Use the credentials below to log in and view your bookings.</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Email:</strong> {data.email}</p>
                    <p><strong>Temporary Password:</strong> <span style="font-size: 18px; font-weight: bold; letter-spacing: 2px;">{temp_password}</span></p>
                </div>
                <p style="color: #64748b; font-size: 14px;">Please change your password after your first login.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 {agency_name}. All rights reserved.</p>
            </div>
            """
            await EmailService.send_email(data.email, subject, body, smtp_config=smtp_config)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send credentials email: {e}")
            # Non-blocking — don't fail the customer creation

    return CustomerSearchResult(
        id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Existing endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("customers", "edit"))
):
    """Create a new customer for the agent (full form with password)"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise ConflictException("this email has already registered")
    
    agent_id = _resolve_agent_id(current_agent)

    # Create new customer associated with the agent
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.CUSTOMER,
        is_active=True,
        email_verified=True  # Assume verified since created by agent
    )
    db.add(user)
    await db.flush()

    customer_profile = Customer(
        user_id=user.id,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        agent_id=agent_id
    )
    db.add(customer_profile)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.get("", response_model=List[UserResponse])
async def list_agent_customers(
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("customers", "view"))
):
    """List all customers belonging to the agent"""
    agent_id = _resolve_agent_id(current_agent)
    query = select(User).join(Customer, User.id == Customer.user_id).where(
        Customer.agent_id == agent_id,
        User.role == UserRole.CUSTOMER
    ).options(
        selectinload(User.customer_profile),
        selectinload(User.agent_profile),
        selectinload(User.admin_profile)
    )
    
    result = await db.execute(query)
    customers = result.scalars().all()
    
    return [UserResponse.model_validate(c) for c in customers]


@router.patch("/{customer_id}/status")
async def toggle_customer_status(
    customer_id: str,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("customers", "edit"))
):
    """Enable or disable a customer account owned by the agent"""
    agent_id = _resolve_agent_id(current_agent)
    query = select(User).join(Customer).where(
        User.id == customer_id,
        Customer.agent_id == agent_id,
        User.role == UserRole.CUSTOMER
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    customer.is_active = is_active
    await db.commit()
    await db.refresh(customer)
    
    return UserResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("customers", "full"))
):
    """Delete a customer account owned by the agent"""
    agent_id = _resolve_agent_id(current_agent)
    query = select(User).join(Customer).where(
        User.id == customer_id,
        Customer.agent_id == agent_id,
        User.role == UserRole.CUSTOMER
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    await db.delete(customer)
    await db.commit()
