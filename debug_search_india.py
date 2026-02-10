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
from app.models import User, Package, PackageStatus, Agent
from sqlalchemy import select, or_

async def check_india_packages():
    async with AsyncSessionLocal() as db:
        print("--- DEBUGGING INDIA PACKAGES ---")
        
        target_domain = "rnt.local" # Adjust if necessary based on user info
        # Check current working directory for context
        print(f"CWD: {os.getcwd()}")
        
        # 1. Find Agent for rnt.local
        print(f"Checking for Agent with domain: {target_domain}")
        stmt = select(Agent).where(Agent.domain == target_domain)
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        
        if not agent:
            print(f"!!! No agent found for domain {target_domain} !!!")
            # Try to list all agents
            print("Listing all agents:")
            result = await db.execute(select(Agent))
            agents = result.scalars().all()
            for a in agents:
                print(f" - Agent: {a.id}, Domain: {a.domain}, UserID: {a.user_id}")
            
            if agents:
                 agent = agents[0]
                 print(f"Using first agent found: {agent.domain} (UserID: {agent.user_id})")
            else:
                 print("No agents found in DB.")
                 return

        print(f"Using Agent: ID={agent.id}, UserID={agent.user_id}, Domain={agent.domain}")

        # 2. Query ALL packages matching 'in' (as per screenshot)
        search_term = "in" 
        print(f"\n[ALL PACKAGES MATCHING '{search_term}']")
        
        stmt = select(Package).where(
            or_(
                Package.destination.ilike(f"%{search_term}%"),
                Package.country.ilike(f"%{search_term}%")
            )
        )
        result = await db.execute(stmt)
        all_packages = result.scalars().all()
        
        print(f"Total packages matching '{search_term}': {len(all_packages)}")
        
        # Print valid packages first
        print("\n--- VALID PACKAGES (Should appear) ---")
        valid_count = 0
        for p in all_packages:
            is_valid = (p.created_by == agent.user_id and 
                        p.status == PackageStatus.PUBLISHED and 
                        p.is_public)
            if is_valid:
                valid_count += 1
                print(f" - {p.destination}, {p.country} (ID: {p.id})")
        
        print(f"Total Valid: {valid_count}")

        # Print invalid packages
        print("\n--- INVALID PACKAGES (Filtered out) ---")
        for p in all_packages:
            reasons = []
            if p.created_by != agent.user_id:
                reasons.append(f"Wrong Agent (Owner: {p.created_by} vs Agent: {agent.user_id})")
            if p.status != PackageStatus.PUBLISHED:
                reasons.append(f"Status: {p.status}")
            if not p.is_public:
                reasons.append("Not Public")
            
            if reasons:
                print(f" - {p.destination}, {p.country} (ID: {p.id}) -> REASONS: {', '.join(reasons)}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_india_packages())
