import asyncio
from app.database import AsyncSessionLocal
from app.models import Booking, User, UserRole
from sqlalchemy import select

async def check_bookings():
    async with AsyncSessionLocal() as db:
        # 1. List all agents to find the one from screenshot
        res = await db.execute(select(User).where(User.role == UserRole.AGENT))
        agents = res.scalars().all()
        
        print(f"Total agents found: {len(agents)}")
        for agent in agents:
            print(f"Agent: {agent.email} (ID: {agent.id})")
            
            # Count statuses
            from sqlalchemy import func
            from app.models import BookingStatus
            
            # All bookings for this agent
            res = await db.execute(select(Booking).where(Booking.agent_id == agent.id))
            bookings = res.scalars().all()
            
            if not bookings:
                continue
                
            print(f"  Total bookings: {len(bookings)}")
            for b in bookings:
                print(f"    Ref: {b.booking_reference}, Status: {b.status}, Amount: {b.total_amount}")
            
            # Check revenue query specifically
            rev_query = select(func.sum(Booking.total_amount)).where(
                Booking.agent_id == agent.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
            )
            res = await db.execute(rev_query)
            rev = res.scalar() or 0
            print(f"  Revenue (Confirmed/Completed): {rev}")
            
            # Check potential revenue (Pending)
            rev_query_pending = select(func.sum(Booking.total_amount)).where(
                Booking.agent_id == agent.id,
                Booking.status == BookingStatus.PENDING
            )
            res = await db.execute(rev_query_pending)
            rev_pending = res.scalar() or 0
            print(f"  Revenue (Pending): {rev_pending}")

if __name__ == "__main__":
    asyncio.run(check_bookings())
