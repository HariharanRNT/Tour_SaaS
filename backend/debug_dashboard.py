
import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import User, Package, Booking, Agent, SubUser

async def check_data():
    async with AsyncSessionLocal() as db:
        domain = "reshandthosh.local"
        agent_stmt = select(Agent).where(Agent.domain == domain)
        agent_profile = (await db.execute(agent_stmt)).scalar_one_or_none()
        
        if not agent_profile:
            print("No agent for domain!")
            return
            
        aid = agent_profile.user_id
        
        print(f"Agent ID: {aid}")
        
        # Check packages
        pkgs = (await db.execute(select(Package).where(Package.created_by == aid))).scalars().all()
        print(f"Found {len(pkgs)} packages for this agent.")
        for p in pkgs:
             print(f" - Package: {p.title} (ID: {p.id})")
             
        # Check bookings
        bks = (await db.execute(select(Booking).where(Booking.agent_id == aid))).scalars().all()
        print(f"Found {len(bks)} bookings for this agent_id.")
        for b in bks:
             print(f" - Booking: {b.booking_reference} (ID: {b.id}) Status: {b.status}")
             
        # Check if there are bookings for OTHER agents or NONE?
        if len(bks) == 0:
             print("No bookings found for this specific agent. Checking ALL bookings...")
             all_bks = (await db.execute(select(Booking))).scalars().all()
             print(f"Total bookings in DB: {len(all_bks)}")
             for b in all_bks:
                  print(f"  - Ref: {b.booking_reference}, Agent ID: {b.agent_id}, Package: {b.package_id}")

if __name__ == "__main__":
    asyncio.run(check_data())
