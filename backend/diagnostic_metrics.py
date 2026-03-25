import asyncio
import os
import sys

# Add backend directory to sys.path to import models
sys.path.append(r"d:\Hariharan\G-Project\RNT_Tour\backend")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, or_
from app.models import Booking, Package, User, UserRole

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get all agents who have created packages
        agent_stmt = select(User).where(User.role == "agent")
        agents = (await db.execute(agent_stmt)).scalars().all()
        
        if not agents:
            print("No agents found.")
            return

        for agent in agents:
            print(f"--- Agent: {agent.email} (ID: {agent.id}) ---")
            
            # Check packages created by this agent
            pkg_stmt = select(Package).where(Package.created_by == agent.id)
            packages = (await db.execute(pkg_stmt)).scalars().all()
            print(f"Packages created: {len(packages)}")
            
            for pkg in packages:
                # Direct bookings for this agent ID
                direct_bookings = (await db.execute(
                    select(func.count(Booking.id)).where(Booking.package_id == pkg.id, Booking.agent_id == agent.id)
                )).scalar()
                
                # Bookings for this package ID (regardless of agent_id)
                total_package_bookings = (await db.execute(
                    select(func.count(Booking.id)).where(Booking.package_id == pkg.id)
                )).scalar()
                
                print(f" - Package: {pkg.title} (ID: {pkg.id})")
                print(f"   - Bookings with agent_id={agent.id}: {direct_bookings}")
                print(f"   - Total bookings for this package: {total_package_bookings}")
                
                if total_package_bookings > 0:
                    from sqlalchemy import text
                    # Raw SQL to check statuses
                    raw_status_res = await db.execute(text(f"SELECT status, agent_id FROM bookings WHERE package_id = '{pkg.id}'"))
                    rows = raw_status_res.all()
                    print(f"   - Raw bookings in DB (status, agent_id): {rows}")
                
    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(check())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
