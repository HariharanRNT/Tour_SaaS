
import asyncio
import os
import sys

# Add current dir to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Booking, Agent

async def check_all_bookings():
    async with AsyncSessionLocal() as db:
        domain = "reshandthosh.local"
        agent_stmt = select(Agent).where(Agent.domain == domain)
        agent = (await db.execute(agent_stmt)).scalar_one_or_none()
        
        if not agent:
            print("No agent for domain!")
            return
            
        aid = agent.user_id
        print(f"Agent User ID: {aid}")
        
        # Check all bookings for this agent
        stmt = select(Booking).where(Booking.agent_id == aid)
        res = await db.execute(stmt)
        bookings = res.scalars().all()
        
        print(f"Found {len(bookings)} bookings for agent {aid}")
        for b in bookings:
            print(f" - Ref: {b.booking_reference}, Status: {b.status}, Amount: {b.total_amount}, User: {b.user_id}")
            
        # Check if there are bookings for THIS domain that don't have this agent_id?
        # (Though agent_id is the primary filter)
        
        # Check all bookings in DB just in case
        print("\nChecking ALL bookings in DB:")
        stmt = select(Booking)
        res = await db.execute(stmt)
        all_bks = res.scalars().all()
        for b in all_bks:
             if b.agent_id != aid:
                  # print(f" - [OTHER] Ref: {b.booking_reference}, Status: {b.status}, Agent: {b.agent_id}")
                  pass
             else:
                  print(f" - [OWN] Ref: {b.booking_reference}, Status: {b.status}, Amount: {b.total_amount}")

if __name__ == "__main__":
    asyncio.run(check_all_bookings())
