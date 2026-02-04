import asyncio
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from app.database import engine
from app.models import User, UserRole, Customer, Agent, Admin
from app.core.security import get_password_hash
from uuid import uuid4

# Test Data
DOMAIN = "profile-test.com"
AGENT_EMAIL = f"agent@{DOMAIN}"
CUST_EMAIL = "customer@gmail.com"

from app.database import engine, Base
from app.models import User, UserRole, Customer, Agent, Admin
from app.core.security import get_password_hash
from uuid import uuid4

# Test Data
DOMAIN = "profile-test.com"
AGENT_EMAIL = f"agent@{DOMAIN}"
CUST_EMAIL = "customer@gmail.com"

async def verify():
    print("--- Verifying User + Profile Architecture ---")
    
    # 1. Rebuild Schema (to ensure DB matches new Models)
    # WARNING: This wipes the test DB.
    async with engine.begin() as conn:
        print("Recreating Database Schema...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        print("Schema Recreated.")

    # 2. Test Agent Creation (User + Agent Profile)
    print(f"\n1. Creating Agent: {AGENT_EMAIL}")
    async with engine.begin() as conn:
        # Create User
        agent_user_id = uuid4()
        await conn.execute(User.__table__.insert().values(
            id=agent_user_id,
            email=AGENT_EMAIL,
            password_hash=get_password_hash("pass"),
            role=UserRole.AGENT,
            is_active=True
        ))
        
        # Create Agent Profile
        agent_profile_id = uuid4()
        await conn.execute(Agent.__table__.insert().values(
            id=agent_profile_id,
            user_id=agent_user_id,
            first_name="Agent",
            last_name="Smith",
            domain=DOMAIN,
            phone="111-222"
        ))
        
    # Verify Agent Proxy
    async with engine.connect() as conn:
        from sqlalchemy.orm import Session
        # We need ORM session for property access, but let's test via direct query first
        # Then we'll use a session block if needed, or just select with join
        stmt = select(User).where(User.email == AGENT_EMAIL).options(selectinload(User.agent_profile))
        # Since we use async engine directly in this script style, we might not get ORM objects easily 
        # without a sessionmaker. Let's use the patterns from deps.py
        pass # We will verify using SQL execution below
        
    print("Agent created. Accessing via ORM...")
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == AGENT_EMAIL).options(
                selectinload(User.admin_profile),
                selectinload(User.agent_profile),
                selectinload(User.customer_profile)
            )
        )
        user = result.scalar_one()
        
        print(f"User Email: {user.email}")
        print(f"Proxy First Name: {user.first_name}") # Should come from profile
        print(f"Proxy Domain: {user.domain}")         # Should come from profile
        
        if user.first_name == "Agent" and user.domain == DOMAIN:
            print("SUCCESS: Agent Proxy attributes working.")
        else:
            print(f"FAIL: Agent attributes mismatch. got {user.first_name}, {user.domain}")
            
        agent_user_id_resolved = user.id

    # 3. Test Customer Creation (User + Customer Profile) linked to Agent
    print(f"\n2. Creating Customer linked to Agent")
    async with AsyncSessionLocal() as session:
        # Create User
        cust_user = User(
            email=CUST_EMAIL,
            password_hash=get_password_hash("pass"),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        session.add(cust_user)
        await session.flush()
        
        # Create Profile
        cust_profile = Customer(
            user_id=cust_user.id,
            first_name="John",
            last_name="Doe",
            phone="555-0199",
            agent_id=agent_user_id_resolved 
        )
        session.add(cust_profile)
        await session.commit()
        await session.refresh(cust_user)
        
        # Verify
        result = await session.execute(
            select(User).where(User.email == CUST_EMAIL).options(
                selectinload(User.admin_profile),
                selectinload(User.agent_profile),
                selectinload(User.customer_profile)
            )
        )
        cust = result.scalar_one()
        
        print(f"Customer Email: {cust.email}")
        print(f"Proxy Phone: {cust.phone}")
        print(f"Proxy Agent ID: {cust.agent_id}")
        
        if cust.phone == "555-0199" and str(cust.agent_id) == str(agent_user_id_resolved):
             print("SUCCESS: Customer Proxy attributes and Linkage working.")
        else:
             print(f"FAIL: Customer mismatch. Phone={cust.phone}, AgentID={cust.agent_id}")

    # 4. Cleanup
    print("\nCleaning up...")
    async with engine.begin() as conn:
        await conn.execute(delete(Customer))
        await conn.execute(delete(Agent))
        await conn.execute(delete(User).where(User.email.in_([AGENT_EMAIL, CUST_EMAIL])))

if __name__ == "__main__":
    asyncio.run(verify())
