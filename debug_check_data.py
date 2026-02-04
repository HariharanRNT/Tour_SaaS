
import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load .env file manually
def load_env():
    env_path = os.path.join(os.getcwd(), 'backend', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env()

from app.database import AsyncSessionLocal
from app.models import User, Package, PackageStatus
from sqlalchemy import select

async def check_data():
    async with AsyncSessionLocal() as db:
        print("--- DEBUGGING DATA ---")
        
        # 1. Find Customer test1
        print("\n[CUSTOMERS]")
        stmt = select(User).where(User.role == 'customer')
        result = await db.execute(stmt)
        customers = result.scalars().all()
        target_customer = None
        for c in customers:
            print(f"ID: {c.id}, Email: {c.email}, Agent ID: {c.agent_id}")
            if 'test1' in c.email or 'test1' in c.first_name.lower():
                target_customer = c

        if not target_customer:
            print("\n!!! Could not find customer 'test1' to simulate query !!!")
            # Try to grab the last customer
            if customers:
                target_customer = customers[-1]
                print(f"Using customer {target_customer.email} instead.")

        # 2. Find Agents
        print("\n[AGENTS]")
        stmt = select(User).where(User.role == 'agent')
        result = await db.execute(stmt)
        agents = result.scalars().all()
        for a in agents:
            print(f"ID: {a.id}, Email: {a.email}")

        # 3. List Packages
        print("\n[PACKAGES]")
        stmt = select(Package)
        result = await db.execute(stmt)
        packages = result.scalars().all()
        for p in packages:
            print(f"ID: {p.id}, Title: {p.title}, Created By: {p.created_by}, Status: {p.status}")

        # 4. SIMULATE QUERY
        if target_customer:
            print(f"\n[SIMULATION] Running search query for customer: {target_customer.email} (Agent: {target_customer.agent_id})")
            
            destination = "Mumbai"
            stmt = select(Package).where(
                Package.destination.ilike(f"%{destination}%"),
                Package.status == PackageStatus.PUBLISHED
            )

            # Logic from packages_enhanced.py
            if target_customer.agent_id:
                print(f"Applying filter: Package.created_by == {target_customer.agent_id}")
                stmt = stmt.where(Package.created_by == target_customer.agent_id)
            else:
                print("No agent_id found, no filter applied.")

            result = await db.execute(stmt)
            found_packages = result.scalars().all()
            print(f"Found {len(found_packages)} packages for '{destination}':")
            for p in found_packages:
                print(f" - {p.title} (Created by: {p.created_by})")
        else:
             print("\nSkipping simulation due to missing customer.")

if __name__ == "__main__":
    asyncio.run(check_data())
