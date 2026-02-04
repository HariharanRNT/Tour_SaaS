import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Customer, User, UserRole

async def list_customers():
    print("Listing all customers and their agent links...")
    async with AsyncSessionLocal() as db:
        stmt = select(Customer).options(selectinload(Customer.agent), selectinload(Customer.user))
        result = await db.execute(stmt)
        customers = result.scalars().all()
        
        for c in customers:
             agent_name = "None"
             if c.agent_id:
                 # Check if we can fetch the agent user
                 agent_user = (await db.execute(select(User).where(User.id == c.agent_id).options(selectinload(User.agent_profile)))).scalar_one_or_none()
                 if agent_user and agent_user.agent_profile:
                     agent_name = f"{agent_user.agent_profile.agency_name} ({agent_user.agent_profile.domain})"
                 else:
                     agent_name = f"User ID {c.agent_id} (Profile Not Found)"
             
             print(f"Customer: {c.user.email} | Agent: {agent_name}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(list_customers())
