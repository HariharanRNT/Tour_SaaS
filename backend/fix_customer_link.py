import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, Agent, Customer

async def fix_customer_link():
    customer_email = "test@gmail.com"
    agent_domain = "haritravels.local"
    
    print(f"Linking {customer_email} to agent with domain {agent_domain}...")
    
    async with AsyncSessionLocal() as db:
        # 1. Find the Agent
        stmt = select(Agent).where(Agent.domain == agent_domain)
        agent = (await db.execute(stmt)).scalar_one_or_none()
        
        if not agent:
            print("[ERROR] Agent 'haritravels.local' not found!")
            return
            
        print(f"Found Agent: {agent.agency_name} (User ID: {agent.user_id})")
        
        # 2. Find the Customer User
        cx_stmt = select(User).where(User.email == customer_email).options(selectinload(User.customer_profile))
        cx_user = (await db.execute(cx_stmt)).scalar_one_or_none()
        
        if not cx_user:
            print("[ERROR] Customer user not found!")
            return
            
        # 3. Update Customer Profile
        if cx_user.customer_profile:
            print(f"Current Agent ID: {cx_user.customer_profile.agent_id}")
            cx_user.customer_profile.agent_id = agent.user_id
            await db.commit()
            print("[SUCCESS] Updated customer profile with correct Agent ID.")
        else:
            print("[INFO] Customer has no profile! Creating one...")
            customer = Customer(
                user_id=cx_user.id,
                first_name="Test",
                last_name="Customer",
                agent_id=agent.user_id
            )
            db.add(customer)
            await db.commit()
            print("[SUCCESS] Created customer profile linked to Agent.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(fix_customer_link())
