import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Agent

async def check_agent_domain():
    domain = "haritravels.local"
    print(f"Checking database for agent with domain: {domain}...")
    
    async with AsyncSessionLocal() as db:
        stmt = select(Agent).where(Agent.domain == domain)
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        
        if agent:
            print(f"✅ FOUND: Agent '{agent.agency_name}' (ID: {agent.id}) has domain '{agent.domain}'")
        else:
            print(f"❌ NOT FOUND: No agent linked to '{domain}'")
            print("To fix this, you need to create an agent with this domain or update an existing one.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_agent_domain())
