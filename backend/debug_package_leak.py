import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, Package, Agent, Customer

async def debug_package_leak():
    # User email from previous context or generic
    # The user mentioned "Agent B's customer". 
    # Let's assume the user registered a new email "b_customer@example.com" or similar
    # But since I don't know the email, I will list ALL customers linked to 'agent.local'
    
    domain = "agent.local"
    print(f"--- Debugging for domain: {domain} ---")
    
    async with AsyncSessionLocal() as db:
        # 0. List ALL Agents for verification
        all_agents = (await db.execute(select(Agent))).scalars().all()
        print(f"Found {len(all_agents)} agents involved:")
        for a in all_agents:
            print(f" - {a.agency_name}: {a.domain} (ID: {a.user_id})")
        
        # 1. Find Agent B
        stmt = select(Agent).where(Agent.domain == domain)
        agent_b = (await db.execute(stmt)).scalar_one_or_none()
        
        if not agent_b:
            print(f"[ERROR] Agent B ({domain}) NOT FOUND in DB.")
            return
        
        print(f"[SUCCESS] Agent B Found: {agent_b.agency_name} (User ID: {agent_b.user_id})")
        
        # 2. Find customers linked to Agent B
        stmt = select(Customer).where(Customer.agent_id == agent_b.user_id).options(selectinload(Customer.user))
        result = await db.execute(stmt)
        customers = result.scalars().all()
        
        if not customers:
            print("⚠️ No customers found linked to Agent B.")
        else:
            print(f"found {len(customers)} customers linked to Agent B.")
            for c in customers:
                print(f" - {c.user.email} (ID: {c.user_id})")
                
                # simulate logic check
                user = c.user
                # Need to manually attach profile for property access since I loaded it on Customer side but accessing from User side 
                # might need explicit loading or reverse relation access
                # Actually c.user backref should work if loaded.
                # Let's reload the user fully to be sure like the API does
                user_stmt = select(User).where(User.id == c.user_id).options(selectinload(User.customer_profile))
                u_result = await db.execute(user_stmt)
                user_full = u_result.scalar_one()
                
                print(f"   [Debug] user.agent_id property: {user_full.agent_id}")
                if user_full.agent_id == agent_b.user_id:
                     print("   ✅ Linkage correct.")
                else:
                     print(f"   ❌ Linkage MISMATCH! Points to {user_full.agent_id} instead of {agent_b.user_id}")
                     
        # 3. Check Packages created by Agent B
        pkg_stmt = select(Package).where(Package.created_by == agent_b.user_id)
        pkgs = (await db.execute(pkg_stmt)).scalars().all()
        print(f"📦 Packages owned by Agent B: {len(pkgs)}")
        
        # 4. Check Agent A packages
        pkg_a_stmt = select(Package).where(Package.created_by != agent_b.user_id)
        pkgs_a = (await db.execute(pkg_a_stmt)).scalars().all()
        print(f"📦 Other Packages (Agent A etc): {len(pkgs_a)}")


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(debug_package_leak())
