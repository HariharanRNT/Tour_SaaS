import asyncio
import httpx
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, UserRole
from app.core.security import get_password_hash

async def setup_test_data():
    async with AsyncSessionLocal() as db:
        # 1. Create Agent with Domain
        agent_email = "branding_test@example.com"
        result = await db.execute(select(User).where(User.email == agent_email))
        agent_user = result.scalar_one_or_none()
        
        if not agent_user:
            print("Creating Branding Test Agent...")
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
                first_name="Branding",
                last_name="Agent",
                domain="branding.local",
                agency_name="Branding Travels"
            )
            db.add(agent_profile)
            await db.commit()
            print(f"Created Agent with domain 'branding.local'")
        else:
            print(f"Agent exists: {agent_user.id}")

async def test_public_endpoint():
    base_url = "http://localhost:8000/api/v1/auth/agent-info"
    
    async with httpx.AsyncClient() as client:
        # Scenario 1: Correct Domain
        print("\n--- Test 1: Fetch info for 'branding.local' ---")
        headers = {"X-Domain": "branding.local"}
        response = await client.get(base_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['agency_name'] == "Branding Travels":
                 print("[PASS] Success: Retrieved correct agency name.")
            else:
                 print(f"[FAIL] Unexpected data: {data}")
        else:
            print(f"[FAIL] Expected 200, got {response.status_code}")

        # Scenario 2: Unknown Domain
        print("\n--- Test 2: Fetch info for 'unknown.local' ---")
        headers = {"X-Domain": "unknown.local"}
        response = await client.get(base_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['agency_name'] is None:
                print("[PASS] Success: Returned null for unknown domain.")
            else:
                print(f"[FAIL] Unexpected data: {data}")
        else:
             print(f"[FAIL] Expected 200, got {response.status_code}")

        # Scenario 3: Localhost
        print("\n--- Test 3: Fetch info for 'localhost' ---")
        headers = {"X-Domain": "localhost"}
        response = await client.get(base_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['agency_name'] is None:
                print("[PASS] Success: Returned null for localhost.")
            else:
                print(f"[FAIL] Unexpected data: {data}")
        else:
             print(f"[FAIL] Expected 200, got {response.status_code}")

if __name__ == "__main__":
    # Ensure DB is populated
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(setup_test_data())
        
        # Run tests
        loop.run_until_complete(test_public_endpoint())
    except Exception as e:
        print(f"Error: {e}")
