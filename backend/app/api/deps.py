"""API dependencies for authentication and database session"""
from typing import Optional, Dict
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, UserRole, SubUser, Customer
from app.core.security import decode_access_token
from app.config import settings


async def get_current_domain(
    x_domain: Optional[str] = Header(None, alias="X-Domain")
) -> str:
    """Get the current domain from the request header"""
    if not x_domain:
        # Fallback for local development or direct API calls
        return "localhost"
    
    # Normalize domain (remove port if present, lowercase)
    return x_domain.split(':')[0].lower()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Eager load profiles to support proxy properties on User model
    # Note: Keep this flat — do NOT chain selectinload across User→SubUser→User
    # as it causes NameError (SubUser not imported) and SQLAlchemy mapper confusion
    query = select(User).where(User.id == user_id).options(
        selectinload(User.admin_profile),
        selectinload(User.agent_profile),
        selectinload(User.customer_profile).selectinload(Customer.agent),
        selectinload(User.sub_user_profile).options(
            selectinload(SubUser.permissions),
            selectinload(SubUser.agent)
        ),
        selectinload(User.subscription)
    )
    
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        print(f"DEBUG AUTH: User not found in database for ID: {user_id}")
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    # REAL-TIME AGENT DEACTIVATION CHECK
    # If the parent agent is deactivated, block access for sub-users and customers
    if user.role == UserRole.SUB_USER:
        if user.sub_user_profile and user.sub_user_profile.agent:
            if not user.sub_user_profile.agent.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This service is currently unavailable. Please contact your administrator."
                )
    
    elif user.role == UserRole.CUSTOMER:
        if user.customer_profile and user.customer_profile.agent:
            if not user.customer_profile.agent.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This service is currently unavailable. Please contact support."
                )

    # For SUB_USER: attach permissions and parent agent_id from JWT payload
    if user.role == UserRole.SUB_USER:
        parent_agent_id = payload.get("agent_id")
        # Attach as dynamic attributes so endpoints can inspect them
        user._sub_user_agent_id = parent_agent_id
        
        # Fetch parent agent's domain via a separate targeted query
        # (avoids complex cross-entity selectinload chaining)
        if parent_agent_id:
            try:
                from app.models import Agent
                agent_q = select(Agent).where(Agent.user_id == parent_agent_id)
                agent_res = await db.execute(agent_q)
                parent_agent = agent_res.scalar_one_or_none()
                if parent_agent:
                    user._sub_user_agent_domain = parent_agent.domain
            except Exception:
                pass  # Non-critical — domain check falls back gracefully
    
    return user



async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current admin user"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_agent(
    current_user: User = Depends(get_current_user),
    current_domain: str = Depends(get_current_domain)
) -> User:
    """Get current agent user (or authorized sub-user) and verify domain ownership"""
    # Allow both AGENT and SUB_USER roles
    if current_user.role not in [UserRole.AGENT, UserRole.SUB_USER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions: Agent access required"
        )
    
    # Strict multi-tenancy check
    if current_user.domain and current_user.domain != current_domain:
        # Only enforce if domain is set. Skip check for known dev/local domains or DEBUG mode
        is_dev = settings.DEBUG or settings.APP_ENV == "development" or current_domain in ['localhost', 'rnt.local', 'aaa.local', '127.0.0.1']
        if not is_dev:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This account belongs to {current_user.domain}, but you are on {current_domain}"
            )
            
    return current_user


async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if token is None:
        return None
    
    try:
        user = await get_current_user(token, db)
        return user
    except HTTPException:
        return None



async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active superuser
    For now, we equate superuser with admin role
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def check_permission(module: str, required_level: str):
    """
    Dependency factory to check if current user has permission for a module/level.
    Levels: view < edit < full
    """
    async def _permission_dependency(
        current_user: User = Depends(get_current_user)
    ) -> User:
        # Admins and primary Agents have full access to everything
        if current_user.role in [UserRole.ADMIN, UserRole.AGENT]:
            return current_user
            
        if current_user.role == UserRole.SUB_USER:
            perms = getattr(current_user, "_sub_user_permissions", [])
            # Find permission for this module
            module_perm = next((p for p in perms if p.get("module") == module), None)
            
            if not module_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: No permissions for module '{module}' (Sub-User)"
                )
            
            level_map = {"view": 1, "edit": 2, "full": 3}
            user_level = level_map.get(module_perm.get("access_level"), 0)
            req_level = level_map.get(required_level, 99) # Default high to block unknown
            
            if user_level >= req_level:
                return current_user
                
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: '{required_level}' access required for '{module}'. (Sub-User UserLevel: {user_level})"
            )
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized role: {current_user.role} for module {module}"
        )
        
    return _permission_dependency
