import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, ApprovalStatus
from app.schemas import UserResponse
import json

def normalize_status(data):
    if isinstance(data, list):
        return [normalize_status(item) for item in data]
    elif isinstance(data, dict):
        status_fields = ['status', 'refund_status', 'payment_status', 'shipping_status', 'payout_status', 'approval_status', 'role']
        normalized = {}
        for key, value in data.items():
            if key in status_fields and isinstance(value, str):
                normalized[key] = value.lower()
            elif isinstance(value, (dict, list)):
                normalized[key] = normalize_status(value)
            else:
                normalized[key] = value
        return normalized
    return data

async def inspect_pending_agent():
    async with AsyncSessionLocal() as session:
        # Avoid the empty name issue by filtering for users with first_name
        stmt = select(User).where(User.approval_status == ApprovalStatus.PENDING, User.first_name != '').limit(1)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("No pending agents with valid data found. Checking any pending agent...")
            stmt = select(User).where(User.approval_status == ApprovalStatus.PENDING).limit(1)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
        if not user:
            print("No pending agents found.")
            return
            
        print(f"User ID: {user.id}")
        print(f"User approval_status (raw): {user.approval_status}")
        
        # Manually construct response dict to avoid Pydantic validation if data is messy
        response_dict = {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "approval_status": user.approval_status.value if hasattr(user.approval_status, 'value') else str(user.approval_status),
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        
        print(f"JSON Response (Original): {json.dumps(response_dict, indent=2)}")
        
        normalized = normalize_status(response_dict)
        print(f"JSON Response (Normalized): {json.dumps(normalized, indent=2)}")
        
        # Direct check
        print(f"Normalized approval_status == 'pending': {normalized['approval_status'] == 'pending'}")

if __name__ == "__main__":
    asyncio.run(inspect_pending_agent())
