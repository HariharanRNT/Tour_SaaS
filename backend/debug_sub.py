
import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select, desc
from app.database import AsyncSessionLocal
from app.models import User, Subscription, Agent

async def check_subscription():
    async with AsyncSessionLocal() as db:
        domain = "reshandthosh.local"
        agent_stmt = select(Agent).where(Agent.domain == domain)
        agent_profile = (await db.execute(agent_stmt)).scalar_one_or_none()
        
        if not agent_profile:
            print("No agent for domain!")
            return
            
        aid = agent_profile.user_id
        print(f"Checking subscription for Agent User ID: {aid}")
        
        sub_stmt = select(Subscription).where(
            Subscription.user_id == aid,
            Subscription.status.in_(['active', 'trial'])
        ).order_by(desc(Subscription.end_date)).limit(1)
        
        sub = (await db.execute(sub_stmt)).scalar_one_or_none()
        
        if sub:
            print(f"Subscription found! ID: {sub.id}, Status: {sub.status}, End Date: {sub.end_date}")
        else:
            print("No active/trial subscription found for this agent.")
            
            # Check ALL subscriptions for this user
            all_sub = (await db.execute(select(Subscription).where(Subscription.user_id == aid))).scalars().all()
            print(f"Total subscriptions for this user: {len(all_sub)}")
            for s in all_sub:
                print(f" - ID: {s.id}, Status: {s.status}, End Date: {s.end_date}")

if __name__ == "__main__":
    asyncio.run(check_subscription())
