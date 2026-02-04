import asyncio
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from app.database import engine, AsyncSessionLocal
from app.models import User, UserRole, Agent, Customer
from app.core.security import get_password_hash
from uuid import uuid4

AGENT_EMAIL = "master@globaltours.com"
CUST1_EMAIL = "traveler1@globaltours.com"
CUST2_EMAIL = "traveler2@globaltours.com"
DOMAIN = "globaltours.com"

async def verify():
    print("--- Verifying Multiple Customers Per Agent ---")
    
    # 1. Cleanup
    async with engine.begin() as conn:
        await conn.execute(delete(Customer))
        await conn.execute(delete(Agent))
        await conn.execute(delete(User).where(User.email.in_([AGENT_EMAIL, CUST1_EMAIL, CUST2_EMAIL])))

    # 2. Create Agent
    print(f"Creating Agent: {AGENT_EMAIL}")
    async with AsyncSessionLocal() as session:
        agent_user = User(
            id=uuid4(),
            email=AGENT_EMAIL,
            password_hash=get_password_hash("pass"),
            role=UserRole.AGENT,
            is_active=True
        )
        session.add(agent_user)
        
        agent_profile = Agent(
            id=uuid4(),
            user_id=agent_user.id,
            first_name="Global",
            last_name="Agent",
            domain=DOMAIN,
            phone="1234567890"
        )
        session.add(agent_profile)
        await session.commit()
        await session.refresh(agent_user)
        agent_user_id = agent_user.id
        print(f"Agent ID: {agent_user_id}")

    # 3. Create Customer 1
    print(f"Registering Customer 1: {CUST1_EMAIL}")
    async with AsyncSessionLocal() as session:
        cust1 = User(
            id=uuid4(),
            email=CUST1_EMAIL,
            password_hash=get_password_hash("pass"),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        session.add(cust1)
        
        cust1_profile = Customer(
            id=uuid4(),
            user_id=cust1.id,
            first_name="Traveler",
            last_name="One",
            phone="123",
            agent_id=agent_user_id # Link to agent
        )
        session.add(cust1_profile)
        await session.commit()
        print("Customer 1 Registered.")

    # 4. Create Customer 2 (Same Agent)
    print(f"Registering Customer 2: {CUST2_EMAIL}")
    async with AsyncSessionLocal() as session:
        cust2 = User(
            id=uuid4(),
            email=CUST2_EMAIL,
            password_hash=get_password_hash("pass"),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        session.add(cust2)
        
        cust2_profile = Customer(
            id=uuid4(),
            user_id=cust2.id,
            first_name="Traveler",
            last_name="Two",
            phone="456",
            agent_id=agent_user_id # Link to same agent
        )
        session.add(cust2_profile)
        await session.commit()
        print("Customer 2 Registered (Multiple customers for same agent verified).")

    # 5. Verify Data via Proxy
    print("\n--- Verifying Data Access ---")
    async with AsyncSessionLocal() as session:
        # Fetch customers with profiles
        stmt = select(User).where(User.email.in_([CUST1_EMAIL, CUST2_EMAIL])).options(
            selectinload(User.admin_profile),
            selectinload(User.agent_profile),
            selectinload(User.customer_profile)
        )
        result = await session.execute(stmt)
        users = result.scalars().all()
        
        for user in users:
            print(f"User: {user.email}")
            print(f" - Proxy First Name: {user.first_name}")
            print(f" - Proxy Last Name: {user.last_name}")
            print(f" - Linked Agent ID: {user.agent_id}")
            
            if str(user.agent_id) != str(agent_user_id):
                print("FAIL: Agent ID mismatch")
            else:
                print("SUCCESS: Correctly linked to Agent")

    # 6. Cleanup
    async with engine.begin() as conn:
        await conn.execute(delete(Customer))
        await conn.execute(delete(Agent))
        await conn.execute(delete(User).where(User.email.in_([AGENT_EMAIL, CUST1_EMAIL, CUST2_EMAIL])))

if __name__ == "__main__":
    asyncio.run(verify())
