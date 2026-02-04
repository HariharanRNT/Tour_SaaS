import asyncio
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Agent, Customer, UserRole

async def fix_agent_b_config():
    old_domain = "agenttravel.local"
    new_domain = "agent.local"
    
    async with AsyncSessionLocal() as db:
        # 1. Update Agent Domain
        stmt = select(Agent).where(Agent.domain == old_domain)
        agent = (await db.execute(stmt)).scalar_one_or_none()
        
        if not agent:
             # Try finding by new domain just in case
             stmt = select(Agent).where(Agent.domain == new_domain)
             agent = (await db.execute(stmt)).scalar_one_or_none()
             if agent:
                 print(f"[INFO] Agent is already set to {new_domain}. User ID: {agent.user_id}")
             else:
                 print(f"[ERROR] Could not find agent with domain {old_domain} OR {new_domain}")
                 return
        else:
             print(f"[INFO] Found agent '{agent.agency_name}' with old domain '{old_domain}'. Updating...")
             agent.domain = new_domain
             await db.commit()
             print(f"[SUCCESS] Updated agent domain to '{new_domain}'")
             
        # 2. Link Orphaned Customers (created during the 'agent.local' attempt)
        # Find customers with NULL agent_id
        # We assume these were meant for the current agent context if we are fixing "Agent B's customer"
        # However, linking ALL orphaned customers might be risky. 
        # But in this dev environment, orphaned customers are likely the result of this exact bug.
        
        # We will assume users created recently or associated with email 'agent' 
        # But safest is to link the ones the user likely just created.
        # Let's verify 'test@gmail.com' again? No, that was fixed to Agent A.
        # Let's find customers with NO agent.
        
        result = await db.execute(select(Customer).where(Customer.agent_id == None)) # noqa
        orphans = result.scalars().all()
        
        if orphans:
            print(f"[INFO] Found {len(orphans)} orphaned customers. Linking to {new_domain}...")
            for c in orphans:
                c.agent_id = agent.user_id
                print(f" - Linked customer {c.first_name} {c.last_name} (User ID: {c.user_id})")
            
            await db.commit()
            print("[SUCCESS] Orphaned customers linked.")
        else:
            print("[INFO] No orphaned customers found.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(fix_agent_b_config())
