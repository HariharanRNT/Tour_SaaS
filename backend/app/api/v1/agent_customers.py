"""Agent Customer Management API routes"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, Customer
from app.schemas import UserCreate, UserResponse
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException
from app.api.deps import get_current_agent, check_permission

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("customers", "edit"))
):
    """Create a new customer for the agent"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise ConflictException("this email has already registered")
    
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
        agent_id=current_agent.agent_id
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
    from sqlalchemy.orm import selectinload
    query = select(User).join(Customer, User.id == Customer.user_id).where(
        Customer.agent_id == current_agent.agent_id,
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
    query = select(User).join(Customer).where(
        User.id == customer_id,
        Customer.agent_id == current_agent.agent_id,
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
    query = select(User).join(Customer).where(
        User.id == customer_id,
        Customer.agent_id == current_agent.agent_id,
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
