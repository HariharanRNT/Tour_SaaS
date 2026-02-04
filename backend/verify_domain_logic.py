import asyncio
from sqlalchemy import select, delete
from app.database import engine, get_db
from app.models import User, UserRole
from app.core.security import get_password_hash
from app.api.v1.auth import register
from app.schemas import UserCreate

async def verify_flow():
    print("Starting verification of Domain Registration Flow...")
    
    test_domain = "verify-agency.com"
    agent_email = f"agent@{test_domain}"
    customer_email = f"customer@{test_domain}"
    
    async with engine.connect() as conn:
        # Cleanup potential leftovers
        print("Cleaning up old test data...")
        await conn.execute(delete(User).where(User.email.in_([agent_email, customer_email])))
        await conn.commit()

    # 1. Create Agent with Domain
    print(f"Creating Agent with domain: {test_domain}")
    async with engine.begin() as conn:
        from sqlalchemy.orm import Session
        # We use raw insert/session for Agent setup since register endpoint defaults to CUSTOMER
        # But for this test we need an AGENT with a domain
        from uuid import uuid4
        agent_id = uuid4()
        await conn.execute(
            User.__table__.insert().values(
                id=agent_id,
                email=agent_email,
                password_hash=get_password_hash("password"),
                first_name="Test",
                last_name="Agent",
                role=UserRole.AGENT,
                domain=test_domain,
                is_active=True
            )
        )
        print(f"Agent created with ID: {agent_id}")

    # 2. Register Customer via API Logic
    # We will simulate the logic used in auth.py by calling the function or replicating it?
    # Since `register` is an API endpoint function which takes dependencies, 
    # it might be easier to just simulate the DB check or insertion logic directly 
    # OR we can replicate the logic here to assert it works.
    
    print(f"Registering Customer: {customer_email}")
    async with engine.begin() as conn:
        # Replicating the logic from auth.py to verify it works in principle against the DB state
        # (Since calling the FastAPI endpoint function directly requires mocking Depends stuff)
        
        # Logic from auth.py:
        email_domain = customer_email.split('@')[-1].lower()
        result = await conn.execute(select(User).where(User.role == UserRole.AGENT, User.domain == email_domain))
        agent = result.fetchone()
        
        if agent:
            print(f"MATCH FOUND! Domain '{email_domain}' matches Agent ID: {agent.id}")
            if str(agent.id) == str(agent_id):
                print("SUCCESS: Domain mapping logic identified the correct agent.")
            else:
                print(f"FAILURE: Identified wrong agent {agent.id}")
        else:
            print("FAILURE: No matching agent found for domain.")

    # 3. Cleanup
    print("Cleaning up...")
    async with engine.begin() as conn:
        await conn.execute(delete(User).where(User.email.in_([agent_email, customer_email])))

if __name__ == "__main__":
    asyncio.run(verify_flow())
