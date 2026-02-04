import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, UserRole

async def list_customer_users():
    print("Listing all users with role 'customer'...")
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.role == UserRole.CUSTOMER).options(selectinload(User.customer_profile))
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        for u in users:
             profile_status = "MISSING"
             agent_status = "N/A"
             if u.customer_profile:
                 profile_status = f"Found (ID: {u.customer_profile.id})"
                 if u.customer_profile.agent_id:
                     agent_status = f"Linked (Agent User ID: {u.customer_profile.agent_id})"
                 else:
                     agent_status = "NOT LINKED"
             
             print(f"User: {u.email} | Profile: {profile_status} | Agent: {agent_status}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(list_customer_users())
