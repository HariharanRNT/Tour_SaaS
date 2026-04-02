"""Authentication API routes"""
from datetime import timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, Customer, Agent, SubUser
from app.schemas import UserCreate, UserResponse, Token, UserLogin, LoginResponse, GoogleLoginRequest, AgentRegistration
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import ConflictException, UnauthorizedException
from app.api.deps import get_current_user, get_current_domain
from app.config import settings
from app.utils.crypto import decrypt_value

logger = logging.getLogger(__name__)

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
            raise ConflictException("this email has already registered")
        
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
        
        # Trigger Welcome Email (Async background task via CustomerNotificationService)
        try:
            from app.services.customer_notification_service import CustomerNotificationService
            # Fetch agent if id was resolved earlier
            agent_user = None
            if agent_user_id:
                agent_res = await db.execute(select(User).where(User.id == agent_user_id))
                agent_user = agent_res.scalar_one_or_none()
            
            await CustomerNotificationService.send_registration_welcome(user, agent_user)
        except Exception as e:
            logger.error(f"Failed to trigger welcome email: {e}")
        
        # Re-fetch user with profiles loaded to prevent MissingGreenlet error on property access
        # db.refresh(user) only reloads attributes, not relationships
        from sqlalchemy.orm import selectinload
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.admin_profile),
            selectinload(User.agent_profile),
            selectinload(User.customer_profile).selectinload(Customer.agent)
        )
        result = await db.execute(stmt)
        user = result.scalar_one()
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        
        # 4. Create and send registration welcome email (using assigned agent's SMTP)
        try:
            from app.services.customer_notification_service import CustomerNotificationService
            await CustomerNotificationService.send_registration_welcome(user)
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            # Non-blocking failure
            pass
        
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


@router.post("/register/agent", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(
    agent_data: AgentRegistration,
    db: AsyncSession = Depends(get_db)
):
    """Register a new agent (self-registration)"""
    from app.models import ApprovalStatus
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == agent_data.email))
    if result.scalar_one_or_none():
        raise ConflictException("this email has already registered")
    
    # Create User (Auth)
    user = User(
        email=agent_data.email,
        password_hash=get_password_hash(agent_data.password),
        role=UserRole.AGENT,
        is_active=False, # Inactive until approved
        approval_status=ApprovalStatus.PENDING,
        email_verified=False
    )
    db.add(user)
    await db.flush()
    
    # Create Agent Profile
    agent = Agent(
        user_id=user.id,
        first_name=agent_data.first_name,
        last_name=agent_data.last_name,
        phone=agent_data.phone,
        agency_name=agent_data.agency_name,
        company_legal_name=agent_data.company_legal_name,
        domain=agent_data.domain,
        business_address=agent_data.business_address,
        country=agent_data.country,
        state=agent_data.state,
        city=agent_data.city
    )
    db.add(agent)
    
    # Create notifications for all admins
    try:
        from app.models import Notification
        admin_stmt = select(User).where(User.role == UserRole.ADMIN)
        admin_result = await db.execute(admin_stmt)
        admins = admin_result.scalars().all()
        
        for admin in admins:
            notification = Notification(
                user_id=admin.id,
                type="agent_registration",
                title="New Agent Registration Request",
                message=f"A new agent {agent_data.first_name} {agent_data.last_name} from {agent_data.agency_name} has registered and is pending approval."
            )
            db.add(notification)
    except Exception as e:
        logger.error(f"Failed to create admin notifications: {str(e)}")
        # Don't fail the registration if notification creation fails
        pass

    await db.commit()
    
    # Reload with profiles
    from sqlalchemy.orm import selectinload
    stmt = select(User).where(User.id == user.id).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    user = result.scalar_one()

    # Trigger Agent Registration Emails
    try:
        from app.services.agent_notification_service import AgentNotificationService
        # Send to Agent
        await AgentNotificationService.send_registration_received_email(user)
        
        # Send to Admins
        admin_stmt = select(User).where(User.role == UserRole.ADMIN)
        admin_result = await db.execute(admin_stmt)
        admins = admin_result.scalars().all()
        await AgentNotificationService.send_admin_registration_request_email(user, admins)
    except Exception as e:
        logger.error(f"Failed to trigger agent registration emails: {e}")
        # Non-blocking
    
    return UserResponse.model_validate(user)


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """Unified login endpoint for all roles"""
    from sqlalchemy.orm import selectinload
    from app.services.otp_service import OTPService
    from app.services.email_service import EmailService
    from app.utils.crypto import decrypt_value

    # 1. Find user by email
    stmt = select(User).where(User.email == form_data.username).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.sub_user_profile).options(
            selectinload(SubUser.permissions),
            selectinload(SubUser.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings)
        ),
        selectinload(User.subscription)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # 2. Basic authentication check
    if not user or not verify_password(form_data.password, user.password_hash):
        raise UnauthorizedException("Incorrect email or password")
    
    if not user.is_active:
        from app.models import ApprovalStatus
        if user.role == UserRole.AGENT and user.approval_status == ApprovalStatus.PENDING:
             raise HTTPException(status_code=400, detail="Your registration request is pending admin approval.")
        elif user.role == UserRole.AGENT and user.approval_status == ApprovalStatus.REJECTED:
             raise HTTPException(status_code=400, detail="Your registration request was rejected. Please contact support.")
        raise HTTPException(status_code=400, detail="Account is inactive")

    # 3. Handle Role-Based Logic
    if user.role in [UserRole.AGENT, UserRole.SUB_USER]:
        # Identify the relevant profiles for notification/SMTP
        agent_profile = None
        if user.role == UserRole.AGENT:
            agent_profile = user.agent_profile
        else:
            # Sub-user inherits parent agent's profile for branding/SMTP
            if user.sub_user_profile and user.sub_user_profile.agent:
                agent_profile = user.sub_user_profile.agent.agent_profile
                
        # Validate Sub-User Domain
        if user.role == UserRole.SUB_USER and agent_profile:
            agent_domain = agent_profile.domain
            if agent_domain and agent_domain.lower() != domain.lower():
                # Allow strict localhost/IP bypass for development, but enforce for rnt.local or production domains
                if domain not in ["localhost", "127.0.0.1"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail="Access denied. You must login from your authorized agency domain."
                    )

        # Check rate limiting
        if not await OTPService.check_login_rate_limit(user.email):
            logger.warning(f"Agent login OTP rate limit exceeded for: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="OTP request limit exceeded. Please try again after 1 hour."
            )
        
        # Generate and store OTP
        otp = OTPService.generate_otp()
        
        # DIAGNOSTIC: Write to file to verify OTP generation
        import os
        try:
            log_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "otp_log.txt")
            with open(log_file, "a") as f:
                from datetime import datetime
                f.write(f"\n{'='*60}\n")
                f.write(f"Timestamp: {datetime.now()}\n")
                f.write(f"Email: {user.email}\n")
                f.write(f"OTP: {otp}\n")
                f.write(f"{'='*60}\n")
        except Exception as e:
            # Silently fail if file write fails - don't crash the login
            pass
        
        # Log to terminal securely via Uvicorn logger
        otp_msg = f"\n{'='*50}\n🔑 AGENT LOGIN OTP: {otp} (for {user.email})\n{'='*50}\n"
        logger.warning(otp_msg)
        print(otp_msg, flush=True)
        
        if not await OTPService.store_login_otp(user.email, otp):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate OTP. Please try again."
            )
        
        # Send OTP email
        agent_name = f"{user.first_name} {user.last_name}" if user.first_name else "Agent Staff"
        
        subject = "Your Login OTP for RNT Tour"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">RNT Tour - Agent Portal</h2>
            <p>Hello {agent_name},</p>
            <p>You requested to login to your agent account. Use the OTP below to complete your login. This OTP is valid for 5 minutes.</p>
            <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">For security reasons, never share this OTP with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 RNT Tour. All rights reserved.</p>
        </div>
        """
        
        # Use agent's SMTP settings if available
        smtp_config = None
        if agent_profile and agent_profile.smtp_settings:
            s = agent_profile.smtp_settings
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
        
        return LoginResponse(
            require_otp=True,
            message="OTP sent successfully to your registered email",
            email=user.email,
            expires_in=300
        )

    # 4. Handle Customer/Admin (Direct Login)
    if user.role == UserRole.CUSTOMER:
        customer_profile = user.customer_profile
        agent_profile = None
        if customer_profile and customer_profile.agent_id:
            # Domain Verification (Existing logic)
            agent_query = await db.execute(select(Agent).where(Agent.user_id == customer_profile.agent_id))
            agent_profile = agent_query.scalar_one_or_none()
            
            if agent_profile:
                agent_domain = agent_profile.domain
                # Allow localhost for development/testing
                if agent_domain and agent_domain.lower() != domain and domain != "localhost":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail=f"Access denied. You must login from {agent_domain}"
                    )
                    
        # Feature: Customer Login OTP
        # Check rate limiting
        if not await OTPService.check_login_rate_limit(user.email):
            logger.warning(f"Customer login OTP rate limit exceeded for: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="OTP request limit exceeded. Please try again after 1 hour."
            )
            
        # Generate and store OTP
        otp = OTPService.generate_otp()
        
        # Log to file
        import os
        try:
            log_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "otp_log.txt")
            with open(log_file, "a") as f:
                from datetime import datetime
                f.write(f"\n{'='*60}\n")
                f.write(f"Timestamp: {datetime.now()}\n")
                f.write(f"Email (Customer): {user.email}\n")
                f.write(f"OTP: {otp}\n")
                f.write(f"{'='*60}\n")
        except Exception:
            pass
            
        # Log to terminal securely via Uvicorn logger
        otp_msg = f"\n{'='*50}\n🔑 CUSTOMER LOGIN OTP: {otp} (for {user.email})\n{'='*50}\n"
        logger.warning(otp_msg)
        print(otp_msg, flush=True)
            
        if not await OTPService.store_login_otp(user.email, otp):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate OTP. Please try again."
            )
            
        # Determine Agency Name and Subject
        agency_name = "RNT Tour"
        if agent_profile and agent_profile.agency_name:
            agency_name = agent_profile.agency_name
            
        customer_name = f"{customer_profile.first_name} {customer_profile.last_name}" if customer_profile else "Valued Traveler"
        
        subject = f"Your Login OTP for {agency_name}"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">{agency_name}</h2>
            <p>Hello {customer_name},</p>
            <p>Welcome back! Use the OTP below to complete your login. This OTP is valid for 5 minutes.</p>
            <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">For security reasons, never share this OTP with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; {datetime.now().year} {agency_name}. All rights reserved.</p>
        </div>
        """
        
        # Pull Agent SMTP credentials if applicable
        smtp_config = None
        if agent_profile:
            from sqlalchemy.orm import selectinload
            agent_stmt = select(Agent).where(Agent.user_id == agent_profile.user_id).options(
                selectinload(Agent.smtp_settings)
            )
            agent_res = await db.execute(agent_stmt)
            loaded_agent = agent_res.scalar_one_or_none()
            
            if loaded_agent and loaded_agent.smtp_settings:
                s = loaded_agent.smtp_settings
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
        
        return LoginResponse(
            require_otp=True,
            message="OTP sent successfully to your registered email",
            email=user.email,
            expires_in=300
        )
    
    # Create access token (for Admin)
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        require_otp=False
    )


@router.post("/google-login", response_model=LoginResponse)
async def google_login(
    data: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """
    Login or Register with Google.
    Verifies the ID token from Google and logs in the user.
    Creates a new account if one doesn't exist.
    """


    import httpx
    from app.core.security import create_access_token
    from sqlalchemy.orm import selectinload
    from app.config import settings

    try:
        # Verify Access Token via UserInfo Endpoint
        # This allows using useGoogleLogin hook (which returns access_token) for custom UI
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(userinfo_url, headers={"Authorization": f"Bearer {data.token}"})
        
        if response.status_code != 200:
            raise ValueError(f"Invalid token: {response.text}")
            
        id_info = response.json()
        
        # Validate audience if needed, but access token is sufficient validation 
        # if obtained directly from user interaction
        
        email = id_info.get('email')
        google_id = id_info.get('sub')
        picture = id_info.get('picture')
        first_name = id_info.get('given_name', '')
        last_name = id_info.get('family_name', '')
        
        if not email:
            raise ValueError('Email not found in token.')

    except (ValueError, httpx.HTTPError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

    # Check if user exists
    stmt = select(User).where(User.email == email).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Update google_id if not set
        if not user.google_id:
            user.google_id = google_id
            if picture and not user.profile_picture_url:
                user.profile_picture_url = picture
            await db.commit()
            await db.refresh(user)
        
        # If user exists but is inactive
        if not user.is_active:
             raise HTTPException(status_code=400, detail="Account is inactive")
             
    else:
        # Registration Flow for New User
        # Only allow creating CUSTOMER accounts via Google Login
        if data.role != UserRole.CUSTOMER:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only Customer accounts can be created via Google Login"
            )

        # Handle formatting
        import secrets
        random_password = secrets.token_urlsafe(16)
        
        # Create User
        user = User(
            email=email,
            password_hash=get_password_hash(random_password),
            role=UserRole.CUSTOMER,
            is_active=True,
            email_verified=True, # Trusted via Google
            google_id=google_id,
            profile_picture_url=picture
        )
        db.add(user)
        await db.flush()
        
        # Create Customer Profile
        customer = Customer(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            phone=None # Phone not always available from Google
        )
        
        # If logging in on an agent domain, associate with that agent
        if domain and domain != "localhost":
             agent_query = await db.execute(select(Agent).where(Agent.domain == domain))
             agent_profile = agent_query.scalar_one_or_none()
             if agent_profile:
                 customer.agent_id = agent_profile.user_id
        
        db.add(customer)
        await db.commit()
        
        # Reload user with profiles
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.customer_profile)
        )
        result = await db.execute(stmt)
        user = result.scalar_one()

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        require_otp=False
    )


# Agent Login OTP Endpoints
from app.schemas import SendLoginOTPRequest, VerifyLoginOTPRequest, SendLoginOTPResponse

@router.post("/send-login-otp", response_model=SendLoginOTPResponse)
async def send_login_otp(
    data: SendLoginOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send OTP for agent login after verifying credentials"""
    import sys
    sys.stderr.write(f"\n{'='*60}\n")
    sys.stderr.write(f"🚀 AGENT LOGIN OTP REQUEST\n")
    sys.stderr.write(f"📧 Email: {data.email}\n")
    sys.stderr.write(f"{'='*60}\n")
    sys.stderr.flush()
    
    from sqlalchemy.orm import selectinload
    from app.services.otp_service import OTPService
    from app.services.email_service import EmailService
    
    # 1. Find user by email
    stmt = select(User).where(User.email == data.email).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.sub_user_profile).options(
            selectinload(SubUser.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    logger.warning(f"✅ Step 1: User lookup complete. Found: {user is not None}")
    
    # Generic error message to prevent user enumeration
    if not user:
        logger.warning(f"❌ User not found for email: {data.email}")
        raise UnauthorizedException("Invalid email or password")
    
    # 2. Verify user role (Allow Agent, Customer, and Sub-User)
    if user.role not in [UserRole.AGENT, UserRole.CUSTOMER, UserRole.SUB_USER]:
        logger.warning(f"❌ User {data.email} is not permitted for OTP login. Role: {user.role}")
        raise UnauthorizedException("Invalid email or password")
    
    logger.warning(f"✅ Step 2: User is an agent")
    
    # 3. Verify password
    if not verify_password(data.password, user.password_hash):
        logger.warning(f"❌ Invalid password for {data.email}")
        raise UnauthorizedException("Invalid email or password")
    
    logger.warning(f"✅ Step 3: Password verified")
    
    # 4. Check if user is active
    if not user.is_active:
        logger.warning(f"❌ User {data.email} is inactive")
        raise HTTPException(status_code=400, detail="Account is inactive")
    
    logger.warning(f"✅ Step 4: User is active")
    
    # 5. Check rate limiting
    if not await OTPService.check_login_rate_limit(data.email):
        logger.warning(f"❌ Rate limit exceeded for {data.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again in an hour."
        )
    
    logger.warning(f"✅ Step 5: Rate limit check passed")
    
    # 6. Generate OTP
    otp = OTPService.generate_otp()
    
    # DIAGNOSTIC: Write to file to verify this code is executing
    import os
    log_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "otp_log.txt")
    with open(log_file, "a") as f:
        from datetime import datetime
        f.write(f"\n{'='*60}\n")
        f.write(f"Timestamp: {datetime.now()}\n")
        f.write(f"Email: {data.email}\n")
        f.write(f"OTP: {otp}\n")
        f.write(f"{'='*60}\n")
    
    # Log to terminal securely via Uvicorn logger
    otp_msg = f"\n{'='*50}\n🔑 LOGIN OTP (RESEND): {otp} (for {data.email})\n{'='*50}\n"
    logger.warning(otp_msg)
    print(otp_msg, flush=True)
    
    # 7. Store OTP in Redis
    if not await OTPService.store_login_otp(data.email, otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate OTP. Please try again."
        )
    
    # 8. Send OTP via email
    # Define Customer vs Agent dynamic layout
    if user.role == UserRole.CUSTOMER:
        customer_profile = user.customer_profile
        agent_profile = None
        if customer_profile and customer_profile.agent_id:
            agent_query = await db.execute(select(Agent).where(Agent.user_id == customer_profile.agent_id))
            agent_profile = agent_query.scalar_one_or_none()

        agency_name = agent_profile.agency_name if (agent_profile and agent_profile.agency_name) else "RNT Tour"
        target_name = f"{customer_profile.first_name} {customer_profile.last_name}" if customer_profile else "Valued Traveler"
        
        subject = f"Your Login OTP for {agency_name}"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">{agency_name}</h2>
            <p>Hello {target_name},</p>
            <p>Welcome back! Use the OTP below to complete your login. This OTP is valid for 5 minutes.</p>
            <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this login, please ignore this email and ensure your account is secure.</p>
            <p style="color: #64748b; font-size: 14px;">For security reasons, never share this OTP with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 {agency_name}. All rights reserved.</p>
        </div>
        """
    else:    
        # Resolve agent profile for branding/SMTP (Parent agent if SUB_USER)
        agent_profile = None
        if user.role == UserRole.AGENT:
            agent_profile = user.agent_profile
        elif user.role == UserRole.SUB_USER and user.sub_user_profile and user.sub_user_profile.agent:
            agent_profile = user.sub_user_profile.agent.agent_profile

        agent_name = f"{user.first_name} {user.last_name}" if user.first_name else "Agent Staff"
        
        subject = "Your Login OTP for RNT Tour"
        body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">RNT Tour - Agent Portal</h2>
            <p>Hello {agent_name},</p>
            <p>You requested to resend the login OTP. Use the code below to complete your login. This OTP is valid for 5 minutes.</p>
            <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this login, please ignore this email and ensure your account is secure.</p>
            <p style="color: #64748b; font-size: 14px;">For security reasons, never share this OTP with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 RNT Tour. All rights reserved.</p>
        </div>
        """
    
    # Use agent's SMTP settings if available
    smtp_config = None
    if agent_profile:
        from sqlalchemy.orm import selectinload
        agent_stmt = select(Agent).where(Agent.user_id == agent_profile.user_id).options(
            selectinload(Agent.smtp_settings)
        )
        agent_res = await db.execute(agent_stmt)
        loaded_agent = agent_res.scalar_one_or_none()
        if loaded_agent and loaded_agent.smtp_settings:
            s = loaded_agent.smtp_settings
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
    
    return SendLoginOTPResponse(
        message="OTP sent successfully to your registered email",
        email=data.email,
        expires_in=300  # 5 minutes
    )


@router.post("/verify-login-otp", response_model=Token)
async def verify_login_otp(
    data: VerifyLoginOTPRequest,
    db: AsyncSession = Depends(get_db),
    domain: str = Depends(get_current_domain)
):
    """Verify OTP and complete login for Agent, Customer, or Sub-User"""
    from sqlalchemy.orm import selectinload
    from app.services.otp_service import OTPService
    
    # 1. Verify OTP from Redis
    is_valid = await OTPService.verify_login_otp(data.email, data.otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # 2. Find user by email
    stmt = select(User).where(User.email == data.email).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings),
        selectinload(User.sub_user_profile).options(
            selectinload(SubUser.permissions),
            selectinload(SubUser.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings)
        ),
        selectinload(User.subscription)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 3. Verify allowed roles
    if user.role not in [UserRole.AGENT, UserRole.CUSTOMER, UserRole.SUB_USER]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Validate Sub-User Domain
    if user.role == UserRole.SUB_USER and user.sub_user_profile and user.sub_user_profile.agent:
        agent_profile = user.sub_user_profile.agent.agent_profile
        if agent_profile and agent_profile.domain:
            agent_domain = agent_profile.domain
            if agent_domain.lower() != domain.lower():
                if domain not in ["localhost", "127.0.0.1"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN, 
                        detail="Access denied. You must login from your authorized agency domain."
                    )
    
    # 4. Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")
    
    # 5. Delete OTP from Redis
    await OTPService.delete_login_otp(data.email)
    
    # 6. Build JWT payload
    token_data: dict = {"sub": str(user.id), "role": user.role.value}

    # For SUB_USER — embed parent agent_id and permissions in the token
    if user.role == UserRole.SUB_USER and user.sub_user_profile:
        sub_user = user.sub_user_profile
        token_data["agent_id"] = str(sub_user.agent_id)
        token_data["permissions"] = user.permissions
        token_data["role_label"] = sub_user.role_label
    
    # 7. Create access token
    access_token = create_access_token(data=token_data)
    
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
        logger.warning(f"Password reset OTP rate limit exceeded for: {data.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OTP request limit exceeded. Please try again after 1 hour."
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
    
    # DIAGNOSTIC: Write to file to verify OTP generation
    import os
    try:
        log_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "otp_log.txt")
        with open(log_file, "a") as f:
            from datetime import datetime
            f.write(f"\n{'='*60}\n")
            f.write(f"Timestamp: {datetime.now()}\n")
            f.write(f"Type: PASSWORD RESET\n")
            f.write(f"Email: {data.email}\n")
            f.write(f"OTP: {otp}\n")
            f.write(f"{'='*60}\n")
    except Exception as e:
        pass  # Silently fail if file write fails
    
    # Log to terminal securely via Uvicorn logger
    otp_msg = f"\n{'='*50}\n🔑 PASSWORD RESET OTP: {otp} (for {data.email})\n{'='*50}\n"
    logger.warning(otp_msg)
    print(otp_msg, flush=True)
    
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
