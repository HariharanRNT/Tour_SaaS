import asyncio
import sys
import os

# Add current directory to path so it can find 'app'
sys.path.append(os.getcwd())

from sqlalchemy import select, func
from app.database import AsyncSessionLocal, engine
from app.models import Booking, BookingStatus, User, UserRole

async def verify_dashboard_stats():
    db = None
    try:
        db = AsyncSessionLocal()
        # Get an agent
        print("Searching for agent...", flush=True)
        agent_stmt = select(User).where(User.role == UserRole.AGENT).limit(1)
        result = await db.execute(agent_stmt)
        agent = result.scalar_one_or_none()
        
        if not agent:
            print("No agent found in database", flush=True)
            return

        print(f"Testing for Agent: {agent.email} ({agent.id})", flush=True)
        
        # Count cancelled bookings directly
        cancel_query = select(func.count(Booking.id)).where(
            Booking.agent_id == agent.id,
            Booking.status == BookingStatus.CANCELLED
        )
        res = await db.execute(cancel_query)
        db_count = res.scalar() or 0
        print(f"Cancelled bookings for agent {agent.id}: {db_count}", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)
    finally:
        if db:
            await db.close()
        await engine.dispose()
        print("Done", flush=True)

if __name__ == "__main__":
    asyncio.run(verify_dashboard_stats())
