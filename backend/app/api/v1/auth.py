"""Authentication API routes"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, Customer, Agent
from app.schemas import UserCreate, UserResponse, Token, UserLogin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import ConflictException, UnauthorizedException
from app.api.deps import get_current_user, get_current_domain
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """Register a new user"""
    try:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ConflictException("Email already registered")
        
        # Use domain from URL context (header)
        registration_domain = domain
        
        # Find Agent Profile for this domain
        agent_user_id = None
        if registration_domain and registration_domain != "localhost":
            agent_query = await db.execute(select(Agent).where(Agent.domain == registration_domain))
            agent_profile = agent_query.scalar_one_or_none()
            if agent_profile:
                agent_user_id = agent_profile.user_id
        
        # Create User (Auth)
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(user)
        await db.flush() # Generate ID
        
        # Create Customer Profile
        customer = Customer(
            user_id=user.id,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            agent_id=agent_user_id
        )
        db.add(customer)
        
        await db.commit()
        
        # Re-fetch user with profiles loaded to prevent MissingGreenlet error on property access
        # db.refresh(user) only reloads attributes, not relationships
        from sqlalchemy.orm import selectinload
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.admin_profile),
            selectinload(User.agent_profile),
            selectinload(User.customer_profile)
        )
        result = await db.execute(stmt)
        user = result.scalar_one()
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """Login user"""
    # Find user by email
    from sqlalchemy.orm import selectinload
    # Basic profile loading is sufficient
    stmt = select(User).where(User.email == form_data.username).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise UnauthorizedException("Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Domain Verification for Customers
    if user.role == UserRole.CUSTOMER:
        customer_profile = user.customer_profile
        if customer_profile and customer_profile.agent_id:
            # Fetch Agent profile directly using agent_id
            # Note: customer.agent_id points to the User ID of the agent
            # We need the Agent profile associated with that User ID
            agent_query = await db.execute(select(Agent).where(Agent.user_id == customer_profile.agent_id))
            agent_profile = agent_query.scalar_one_or_none()
            
            if agent_profile:
                agent_domain = agent_profile.domain
                
                # Check if domain matches
                if agent_domain and agent_domain.lower() != domain:
                    print(f"Login denied: Customer belongs to {agent_domain} but trying to login from {domain}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail=f"Access denied. You must login from {agent_domain}"
                    )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
@router.get("/agent-info")
async def get_public_agent_info(
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """
    Get public agent information based on domain.
    Used for branding the login page.
    """
    if not domain or domain == "localhost":
        return {"agency_name": None, "agent_name": None, "domain": domain}
        
    # Find agent by domain
    stmt = select(Agent).where(Agent.domain == domain)
    result = await db.execute(stmt)
    agent_profile = result.scalar_one_or_none()
    
    if not agent_profile:
        # Check case-insensitive if strictly needed, but exact match preferred for now
        # Also could check if it's a subdomain logic here if needed
        return {"agency_name": None, "agent_name": None, "domain": domain}
        
    return {
        "agency_name": agent_profile.agency_name or f"{agent_profile.first_name}'s Agency",
        "agent_name": f"{agent_profile.first_name} {agent_profile.last_name}",
        "domain": agent_profile.domain
    }


from app.schemas import ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from app.services.email_service import EmailService
from app.services.otp_service import OTPService
from app.utils.crypto import decrypt_value
import random
import string
from datetime import datetime, timedelta

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Initiate password reset flow"""
    # 1. Check Rate Limit
    if not await OTPService.check_rate_limit(data.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )

    # 2. Check if email exists in customer table (Requirement: check if exists in customer table)
    # Actually, the user asked to check if email exists in customer table.
    # But User model is what handles auth. Let's check User first then Customer if needed.
    # The requirement says "Check if the email exists in the customer table".
    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email ID is not registered."
        )
    
    # 3. Generate 6-digit OTP
    otp = OTPService.generate_otp()
    print(f"DEBUG: OTP for {data.email}: {otp}")
    
    # 4. Store OTP in Redis
    if not await OTPService.store_otp(data.email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate secure OTP. Please try again."
        )
    
    # 5. Send Email
    subject = "Your Password Reset OTP"
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">RNT Tour</h2>
        <p>Hello {user.first_name or 'there'},</p>
        <p>You requested to reset your password. Use the OTP below to proceed. This OTP is valid for 5 minutes.</p>
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
            {otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">If you didn't request this, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 RNT Tour. All rights reserved.</p>
    </div>
    """
    
    # Check if user is an agent's customer to use agent's SMTP if available
    smtp_config = None
    if user.role == UserRole.CUSTOMER and user.customer_profile and user.customer_profile.agent_id:
        from sqlalchemy.orm import selectinload
        agent_stmt = select(Agent).where(Agent.user_id == user.customer_profile.agent_id).options(
            selectinload(Agent.smtp_settings)
        )
        agent_res = await db.execute(agent_stmt)
        agent = agent_res.scalar_one_or_none()
        if agent and agent.smtp_settings:
            s = agent.smtp_settings
            smtp_config = {
                "host": s.host,
                "port": s.port,
                "user": s.username,
                "password": decrypt_value(s.password),
                "from_email": s.from_email,
                "from_name": s.from_name,
                "encryption_type": s.encryption_type
            }
    
    await EmailService.send_email(user.email, subject, body, smtp_config=smtp_config)
    
    return {"message": "OTP sent successfully to your registered email."}


@router.post("/verify-otp")
async def verify_otp(
    data: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP provided by user"""
    # 1. Verify against Redis
    is_valid = await OTPService.verify_otp(data.email, data.otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid or expired OTP"
        )
        
    return {"message": "OTP verified successfully", "token": data.otp}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using verified OTP/Token"""
    # 1. Find User
    stmt = select(User).where(User.email == data.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Verify OTP/Token again from Redis
    is_valid = await OTPService.verify_otp(data.email, data.token)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid or expired reset session"
        )
        
    # 3. Update Password
    user.password_hash = get_password_hash(data.new_password)
    
    # 4. Clear OTP from Redis
    await OTPService.delete_otp(data.email)
    
    await db.commit()
    
    return {"message": "Your password has been reset successfully. Please login with your new password."}
