
import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Agent, User
from app.api.v1.agent_dashboard import get_agent_dashboard_stats
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from app.config import settings

async def test_dashboard():
    # Initialize cache for the script
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    
    async with AsyncSessionLocal() as db:
        # Get the agent for reshandthosh.local
        domain = "reshandthosh.local"
        agent_stmt = select(Agent).where(Agent.domain == domain)
        agent_profile = (await db.execute(agent_stmt)).scalar_one_or_none()
        
        if not agent_profile:
            print("No agent for domain!")
            return
            
        # Get the associated User object
        user_stmt = select(User).where(User.id == agent_profile.user_id)
        current_agent = (await db.execute(user_stmt)).scalar_one_or_none()
        
        if not current_agent:
             print("No user for agent profile!")
             return

        # Force clear dashboard cache
        print("Clearing dashboard cache...")
        await FastAPICache.clear(namespace="dashboard")
        
        # Test 1: Fetch stats
        print(f"Fetching stats for agent {current_agent.email}...")
        stats = await get_agent_dashboard_stats(filter_type="ALL", db=db, current_agent=current_agent)
        
        print("\nDashboard Stats Summary:")
        print(f"  Total Packages: {stats['totalPackages']}")
        print(f"  Published Packages: {stats['publishedPackages']}")
        print(f"  Total Bookings: {stats['totalBookings']}")
        print(f"  Today's Bookings: {stats['todayBookings']}")
        print(f"  Total Revenue: ₹{stats['totalRevenue']}")
        print(f"  Active Bookings: {stats['activeBookings']}")
        
        # Check if they are non-zero (based on my previous DB check)
        if stats['totalPackages'] > 0:
            print("\nSUCCESS: Dashboard is showing packages.")
        else:
            print("\nFAILURE: Dashboard is still showing 0 packages.")
            
        if stats['totalBookings'] > 0:
            print("SUCCESS: Dashboard is showing bookings.")
        else:
            print("FAILURE: Dashboard is still showing 0 bookings.")

if __name__ == "__main__":
    asyncio.run(test_dashboard())
