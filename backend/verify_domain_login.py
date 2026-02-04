import asyncio
import httpx
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, Customer, UserRole
from app.core.security import get_password_hash

async def setup_test_data():
    async with AsyncSessionLocal() as db:
        # 1. Create Agent with Domain
        agent_email = "agent_domain_test@example.com"
        result = await db.execute(select(User).where(User.email == agent_email))
        agent_user = result.scalar_one_or_none()
        
        if not agent_user:
            print("Creating Test Agent...")
            agent_user = User(
                email=agent_email,
                password_hash=get_password_hash("password123"),
                role=UserRole.AGENT,
                is_active=True
            )
            db.add(agent_user)
            await db.flush()
            
            agent_profile = Agent(
                user_id=agent_user.id,
                first_name="Agent",
                last_name="Domain",
                domain="agenta.local",
                agency_name="Agent A Travels"
            )
            db.add(agent_profile)
            await db.commit()
            print(f"Created Agent ID: {agent_user.id} with domain 'agenta.local'")
        else:
            print(f"Agent exists: {agent_user.id}")

        # 2. Create Customer linked to Agent
        customer_email = "customer_domain_test@example.com"
        result = await db.execute(select(User).where(User.email == customer_email))
        customer_user = result.scalar_one_or_none()
        
        if not customer_user:
            print("Creating Test Customer...")
            customer_user = User(
                email=customer_email,
                password_hash=get_password_hash("password123"),
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(customer_user)
            await db.flush()
            
            customer_profile = Customer(
                user_id=customer_user.id,
                first_name="Customer",
                last_name="Tester",
                agent_id=agent_user.id
            )
            db.add(customer_profile)
            await db.commit()
            print(f"Created Customer ID: {customer_user.id} linked to Agent {agent_user.id}")
        else:
            print(f"Customer exists: {customer_user.id}")

async def test_login():
    base_url = "http://localhost:8000/api/v1/auth/login"
    username = "customer_domain_test@example.com"
    password = "password123"
    
    async with httpx.AsyncClient() as client:
        # Scenario 1: Correct Domain
        print("\n--- Test 1: login from CORRECT domain (agenta.local) ---")
        headers = {"X-Domain": "agenta.local"}
        response = await client.post(base_url, data={"username": username, "password": password}, headers=headers)
        if response.status_code == 200:
            print("[PASS] Success: Login allowed from correct domain.")
        else:
            print(f"[FAIL] Failed: Expected 200, got {response.status_code}")
            print(response.json())

        # Scenario 2: Wrong Domain
        print("\n--- Test 2: login from WRONG domain (other.local) ---")
        headers = {"X-Domain": "other.local"}
        response = await client.post(base_url, data={"username": username, "password": password}, headers=headers)
        if response.status_code == 403:
            print("[PASS] Success: Login denied from wrong domain.")
            print(f"Response: {response.json()['detail']}")
        else:
            print(f"[FAIL] Failed: Expected 403, got {response.status_code}")
            print(response.json())

        # Scenario 3: Localhost (Should fail if strict)
        print("\n--- Test 3: login from LOCALHOST ---")
        headers = {"X-Domain": "localhost"}
        response = await client.post(base_url, data={"username": username, "password": password}, headers=headers)
        if response.status_code == 403:
            print("[PASS] Success: Login denied from localhost (Strict Check).")
        else:
            print(f"[FAIL] Failed: Expected 403, got {response.status_code}")
            print(response.json())

if __name__ == "__main__":
    # Ensure DB is populated
    loop = asyncio.get_event_loop()
    loop.run_until_complete(setup_test_data())
    
    # Run tests
    loop.run_until_complete(test_login())
