"""Agent Sub-User Management API"""
import secrets
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, UserRole, Agent, SubUser, SubUserPermission
from app.schemas import (
    SubUserCreate, SubUserUpdate, SubUserResponse, SubUserListResponse, SubUserPermissionIn
)
from app.api.deps import get_current_user
from app.core.security import get_password_hash

import logging
from app.config import settings
logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Predefined Role Permission Presets ──────────────────────────────────────

ROLE_PRESETS = {
    "Package Manager": [
        {"module": "dashboard", "access_level": "view"},
        {"module": "packages", "access_level": "full"},
        {"module": "activities", "access_level": "full"},
    ],
    "Finance Manager": [
        {"module": "dashboard", "access_level": "view"},
        {"module": "billing", "access_level": "full"},
        {"module": "finance_reports", "access_level": "full"},
    ],
    "Report Viewer": [
        {"module": "dashboard", "access_level": "view"},
        {"module": "bookings", "access_level": "view"},
        {"module": "finance_reports", "access_level": "view"},
        {"module": "enquiries", "access_level": "view"},
    ],
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^"
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def get_agent_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the caller is an Agent (owner)."""
    if current_user.role != UserRole.AGENT:
        raise HTTPException(status_code=403, detail="Only agents can manage sub-users")
    return current_user


def _build_response(sub_user: SubUser) -> dict:
    """Build a flat SubUserResponse dict from a SubUser ORM object."""
    u = sub_user.user
    return {
        "id": sub_user.id,
        "user_id": sub_user.user_id,
        "agent_id": sub_user.agent_id,
        "role_label": sub_user.role_label,
        "is_active": sub_user.is_active,
        "created_at": sub_user.created_at,
        "first_name": u.profile.first_name if u and u.profile else "",
        "last_name": u.profile.last_name if u and u.profile else "",
        "email": u.email if u else "",
        "phone": u.phone if u else None,
        "permissions": sub_user.permissions or [],
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=SubUserListResponse)
async def list_sub_users(
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """List all sub-users belonging to the current agent."""
    stmt = (
        select(SubUser)
        .where(SubUser.agent_id == agent.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
        .order_by(SubUser.created_at.desc())
    )
    result = await db.execute(stmt)
    sub_users = result.scalars().all()

    return {
        "sub_users": [_build_response(s) for s in sub_users],
        "total": len(sub_users),
    }


@router.post("", response_model=SubUserResponse, status_code=status.HTTP_201_CREATED)
async def create_sub_user(
    data: SubUserCreate,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new sub-user under the current agent."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    # Generate temp password
    temp_password = generate_temp_password()

    # Create the User auth record
    new_user = User(
        email=data.email,
        password_hash=get_password_hash(temp_password),
        role=UserRole.SUB_USER,
        is_active=True,
        email_verified=True,
    )
    db.add(new_user)
    await db.flush()

    # Create Customer profile to carry first/last name & phone
    from app.models import Customer
    new_customer = Customer(
        user_id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        agent_id=agent.id,
    )
    db.add(new_customer)
    await db.flush()

    # Determine permissions — use preset if role_label is a known preset
    perms_to_save = data.permissions
    if data.role_label in ROLE_PRESETS and not perms_to_save:
        perms_to_save = [SubUserPermissionIn(**p) for p in ROLE_PRESETS[data.role_label]]

    # Create SubUser record
    sub_user = SubUser(
        user_id=new_user.id,
        agent_id=agent.id,
        role_label=data.role_label,
        is_active=True,
    )
    db.add(sub_user)
    await db.flush()

    # Create permission records
    for perm in perms_to_save:
        db.add(SubUserPermission(
            sub_user_id=sub_user.id,
            module=perm.module,
            access_level=perm.access_level,
        ))

    await db.commit()

    # Send welcome / temp password email
    try:
        from app.services.email_service import EmailService
        from app.models import AgentSMTPSettings

        # Load agent SMTP config
        smtp_stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.agent_profile.id)
        smtp_res = await db.execute(smtp_stmt)
        smtp_settings = smtp_res.scalar_one_or_none()

        smtp_config = None
        if smtp_settings:
            from app.utils.crypto import decrypt_value
            smtp_config = {
                "host": smtp_settings.host,
                "port": smtp_settings.port,
                "user": smtp_settings.username,
                "password": decrypt_value(smtp_settings.password),
                "from_email": smtp_settings.from_email,
                "from_name": smtp_settings.from_name,
                "encryption_type": smtp_settings.encryption_type,
            }

        login_url = f"{settings.FRONTEND_URL}/login"
        agency = agent.agency_name or "Your Agency"
        subject = f"Welcome to {agency} – Your Sub-User Account"
        body = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
            <h2 style="color:#FF8C5A;text-align:center;">{agency} – Staff Portal</h2>
            <p>Hello {data.first_name} {data.last_name},</p>
            <p>An account has been created for you as a <strong>{data.role_label}</strong> on the {agency} travel portal.</p>
            <p>Use the credentials below to log in:</p>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin: 4px 0;"><strong>Login Email:</strong> {data.email}</p>
                <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size:18px;letter-spacing:4px;">{temp_password}</code></p>
            </div>
            
            <div style="text-align:center;margin:25px 0;">
                <a href="{login_url}" style="background-color:#FF8C5A;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Login to Portal</a>
            </div>
            
            <p style="color:#64748b;font-size:13px;">You will be asked to change your password upon first login. Do not share these credentials.</p>
            <hr style="border:0;border-top:1px solid #eee;margin:20px 0;"/>
            <p style="text-align:center;color:#94a3b8;font-size:12px;">&copy; 2026 {agency}. All rights reserved.</p>
        </div>
        """
        await EmailService.send_email(data.email, subject, body, smtp_config=smtp_config)
        logger.info(f"Welcome email sent to sub-user {data.email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to sub-user {data.email}: {e}")
        # Non-blocking — still create the account

    # Log temp password to console for dev
    logger.warning(f"[DEV] Sub-user temp password for {data.email}: {temp_password}")

    # Reload with relationships
    reload_stmt = (
        select(SubUser)
        .where(SubUser.user_id == new_user.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
    )
    reload_res = await db.execute(reload_stmt)
    sub_user = reload_res.scalar_one()

    return _build_response(sub_user)


@router.get("/{sub_user_id}", response_model=SubUserResponse)
async def get_sub_user(
    sub_user_id: str,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sub-user by ID."""
    stmt = (
        select(SubUser)
        .where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
    )
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")
    return _build_response(sub_user)


@router.put("/{sub_user_id}", response_model=SubUserResponse)
async def update_sub_user(
    sub_user_id: str,
    data: SubUserUpdate,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit sub-user name, phone, role label, and permissions."""
    stmt = (
        select(SubUser)
        .where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
    )
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")

    # Update role label
    if data.role_label is not None:
        sub_user.role_label = data.role_label

    # Update profile name / phone
    if sub_user.user and sub_user.user.customer_profile:
        profile = sub_user.user.customer_profile
        if data.first_name is not None:
            profile.first_name = data.first_name
        if data.last_name is not None:
            profile.last_name = data.last_name
        if data.phone is not None:
            profile.phone = data.phone

    # Replace permissions if provided
    if data.permissions is not None:
        await db.execute(
            delete(SubUserPermission).where(SubUserPermission.sub_user_id == sub_user.id)
        )
        # If using a preset and no custom perms supplied, apply preset
        perms_to_save = data.permissions
        if data.role_label in ROLE_PRESETS and not perms_to_save:
            perms_to_save = [SubUserPermissionIn(**p) for p in ROLE_PRESETS[data.role_label]]

        for perm in perms_to_save:
            db.add(SubUserPermission(
                sub_user_id=sub_user.id,
                module=perm.module,
                access_level=perm.access_level,
            ))

    await db.commit()

    # Reload
    reload_res = await db.execute(stmt)
    sub_user = reload_res.scalar_one()
    return _build_response(sub_user)


@router.put("/{sub_user_id}/permissions", response_model=SubUserResponse)
async def replace_permissions(
    sub_user_id: str,
    permissions: List[SubUserPermissionIn],
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Fully replace the permission set for a sub-user."""
    stmt = (
        select(SubUser)
        .where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
    )
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")

    await db.execute(
        delete(SubUserPermission).where(SubUserPermission.sub_user_id == sub_user.id)
    )
    for perm in permissions:
        db.add(SubUserPermission(
            sub_user_id=sub_user.id,
            module=perm.module,
            access_level=perm.access_level,
        ))

    await db.commit()
    reload_res = await db.execute(stmt)
    sub_user = reload_res.scalar_one()
    return _build_response(sub_user)


@router.put("/{sub_user_id}/toggle-active", response_model=SubUserResponse)
async def toggle_sub_user_active(
    sub_user_id: str,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle active/inactive status for a sub-user."""
    stmt = (
        select(SubUser)
        .where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
        .options(
            selectinload(SubUser.user).selectinload(User.customer_profile),
            selectinload(SubUser.user).selectinload(User.agent_profile),
            selectinload(SubUser.permissions),
        )
    )
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")

    sub_user.is_active = not sub_user.is_active
    if sub_user.user:
        sub_user.user.is_active = sub_user.is_active

    await db.commit()
    reload_res = await db.execute(stmt)
    sub_user = reload_res.scalar_one()
    return _build_response(sub_user)


@router.post("/{sub_user_id}/reset-password")
async def reset_sub_user_password(
    sub_user_id: str,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new temporary password and email it to the sub-user."""
    stmt = (
        select(SubUser)
        .where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
        .options(selectinload(SubUser.user))
    )
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")

    temp_password = generate_temp_password()
    sub_user.user.password_hash = get_password_hash(temp_password)
    await db.commit()

    # Send email with new password
    try:
        from app.services.email_service import EmailService
        from app.models import AgentSMTPSettings

        smtp_stmt = select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.agent_profile.id)
        smtp_res = await db.execute(smtp_stmt)
        smtp_settings = smtp_res.scalar_one_or_none()

        smtp_config = None
        if smtp_settings:
            from app.utils.crypto import decrypt_value
            smtp_config = {
                "host": smtp_settings.host,
                "port": smtp_settings.port,
                "user": smtp_settings.username,
                "password": decrypt_value(smtp_settings.password),
                "from_email": smtp_settings.from_email,
                "from_name": smtp_settings.from_name,
                "encryption_type": smtp_settings.encryption_type,
            }

        login_url = f"{settings.FRONTEND_URL}/login"
        agency = agent.agency_name or "Your Agency"
        subject = f"{agency} – Your Password Has Been Reset"
        body = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
            <h2 style="color:#FF8C5A;text-align:center;">{agency} – Staff Portal</h2>
            <p>Hello,</p>
            <p>Your account password has been reset by your administrator.</p>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
                <p><strong>New Temporary Password:</strong> <code style="font-size:18px;letter-spacing:4px;">{temp_password}</code></p>
            </div>
            
            <div style="text-align:center;margin:25px 0;">
                <a href="{login_url}" style="background-color:#FF8C5A;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Login to Portal</a>
            </div>
            
            <p style="color:#64748b;font-size:13px;">Please log in and update your password immediately. Do not share these credentials.</p>
        </div>
        """
        await EmailService.send_email(sub_user.user.email, subject, body, smtp_config=smtp_config)
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")

    logger.warning(f"[DEV] Sub-user password reset for {sub_user.user.email}: {temp_password}")
    return {"message": "Password reset successfully. New credentials have been emailed to the sub-user."}


@router.delete("/{sub_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sub_user(
    sub_user_id: str,
    agent: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a sub-user and their auth account."""
    stmt = select(SubUser).where(SubUser.id == sub_user_id, SubUser.agent_id == agent.id)
    result = await db.execute(stmt)
    sub_user = result.scalar_one_or_none()
    if not sub_user:
        raise HTTPException(status_code=404, detail="Sub-user not found")

    # Delete the User record (cascade deletes SubUser + SubUserPermissions)
    user_stmt = select(User).where(User.id == sub_user.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if user:
        await db.delete(user)
    else:
        await db.delete(sub_user)

    await db.commit()
