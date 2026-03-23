import asyncio
import uuid
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import Booking, BookingStatus, User, UserRole

async def verify_dashboard_stats():
    async with AsyncSessionLocal() as db:
        # Get an agent
        agent_stmt = select(User).where(User.role == UserRole.AGENT).limit(1)
        result = await db.execute(agent_stmt)
        agent = result.scalar_one_or_none()
        
        if not agent:
            print("No agent found in database")
            return

        print(f"Testing for Agent: {agent.email} ({agent.id})")
        
        # Count cancelled bookings directly
        cancel_query = select(func.count(Booking.id)).where(
            Booking.agent_id == agent.id,
            Booking.status == BookingStatus.CANCELLED
        )
        res = await db.execute(cancel_query)
        db_count = res.scalar() or 0
        print(f"Cancelled bookings for agent {agent.id}: {db_count}")
        
        # Verify active bookings count excludes cancelled
        active_query = select(func.count(Booking.id)).where(
            Booking.agent_id == agent.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
        )
        res = await db.execute(active_query)
        active_count = res.scalar() or 0
        print(f"Active bookings for agent {agent.id}: {active_count}")

if __name__ == "__main__":
    asyncio.run(verify_dashboard_stats())
