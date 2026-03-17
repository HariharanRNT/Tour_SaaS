
import asyncio
import os
import sys

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Agent

async def test_domain():
    print("--- Starting Domain Test ---")
    async with AsyncSessionLocal() as db:
        # Check all agents first to see what's in the DB
        all_agents_stmt = select(Agent)
        all_res = await db.execute(all_agents_stmt)
        all_agents = all_res.scalars().all()
        print(f"Total agents in DB: {len(all_agents)}")
        for a in all_agents:
            print(f"Agent: {a.agency_name}, Domain: {a.domain}, HasSettings: {a.homepage_settings is not None}")

        domain = "rnt.local"
        print(f"Testing domain: {domain}")
        stmt = select(Agent).where(Agent.domain == domain)
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        
        if agent:
            print(f"SUCCESS: FOUND agent with domain {domain}: {agent.agency_name}")
            print(f"Homepage Settings Keys: {list(agent.homepage_settings.keys()) if agent.homepage_settings else 'None'}")
        else:
            print(f"NOT FOUND: No agent with strict domain {domain}")
            
            # Check fallback
            if domain.endswith('.local'):
                print("Testing .local fallback...")
                stmt = select(Agent).order_by(Agent.homepage_settings.isnot(None).desc()).limit(1)
                result = await db.execute(stmt)
                agent = result.scalar_one_or_none()
                if agent:
                    print(f"FALLBACK SUCCESS: Found agent {agent.agency_name}")
                    print(f"Fallback Settings Keys: {list(agent.homepage_settings.keys()) if agent.homepage_settings else 'None'}")
                else:
                    print("FALLBACK FAILED: No agents with settings found.")
    print("--- Domain Test Finished ---")

if __name__ == "__main__":
    asyncio.run(test_domain())
