import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, ApprovalStatus
from app.schemas import UserResponse
import json

async def inspect_pending_agent():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.approval_status == ApprovalStatus.PENDING).limit(1)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("No pending agents found.")
            return
            
        print(f"User ID: {user.id}")
        print(f"User approval_status (raw): {user.approval_status}")
        print(f"User is_active: {user.is_active}")
        
        response = UserResponse.model_validate(user)
        response_dict = response.model_dump(mode='json')
        print(f"JSON Response: {json.dumps(response_dict, indent=2)}")

if __name__ == "__main__":
    asyncio.run(inspect_pending_agent())
