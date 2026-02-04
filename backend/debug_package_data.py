
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Agent, Package, User, PackageAvailability

async def debug_data():
    async with AsyncSessionLocal() as db:
        print("--- Debugging Package Data ---")
        
        # 1. Find Agent for rnt.local
        domain = "rnt.local"
        query = select(Agent).where(Agent.domain == domain)
        result = await db.execute(query)
        agent = result.scalar_one_or_none()
        
        if not agent:
            print(f"No agent found for domain: {domain}")
            return
            
        print(f"Found Agent: {agent.agency_name} (ID: {agent.user_id})")
        
        # 2. Find Packages for this Agent
        query = select(Package).where(
            Package.created_by == agent.user_id,
            Package.status == "published"
        )
        result = await db.execute(query)
        packages = result.scalars().all()
        
        print(f"\nFound {len(packages)} published packages for agent:")
        for p in packages:
            print(f"- {p.title}")
            print(f"  ID: {p.id}")
            print(f"  Destination: {p.destination}")
            print(f"  Duration: {p.duration_days} Days")
            
            # Check availability
            av_query = select(PackageAvailability).where(PackageAvailability.package_id == p.id)
            av_result = await db.execute(av_query)
            avs = av_result.scalars().all()
            if avs:
                print(f"  Availability: {len(avs)} slots")
                for av in avs:
                    print(f"    {av.available_from} to {av.available_to}")
            else:
                print("  No availability records found!")
            print("")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_data())
