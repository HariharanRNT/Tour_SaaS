
import asyncio
from sqlalchemy import select, func, case, text
from app.database import AsyncSessionLocal
from app.models import Package, Booking, User, UserRole, BookingStatus

async def check_admin_stats():
    async with AsyncSessionLocal() as db:
        print("--- Checking Admin Dashboard Stats ---")
        
        # 1. Total Packages
        stmt = select(func.count(Package.id))
        result = await db.execute(stmt)
        total_packages = result.scalar() or 0
        print(f"Total Packages: {total_packages}")
        
        # 2. Total Bookings
        stmt = select(func.count(Booking.id))
        result = await db.execute(stmt)
        total_bookings = result.scalar() or 0
        print(f"Total Bookings: {total_bookings}")
        
        # 3. Total Revenue
        print(f"Checking Revenue for statuses: {BookingStatus.CONFIRMED.value}, {BookingStatus.COMPLETED.value}")
        stmt = select(func.sum(Booking.total_amount)).where(
            Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.COMPLETED.value])
        )
        result = await db.execute(stmt)
        total_revenue = result.scalar() or 0
        print(f"Total Revenue: {total_revenue}")
        
        # 4. Agent Stats
        print("Checking Agents...")
        stmt = select(
            func.count(User.id),
            func.sum(case((User.is_active == True, 1), else_=0)),
            func.sum(case((User.is_active == False, 1), else_=0))
        ).where(User.role == UserRole.AGENT)
        
        result = await db.execute(stmt)
        row = result.one()
        print(f"Total Agents: {row[0]}")
        print(f"Active Agents: {row[1]}")
        print(f"Inactive Agents: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_admin_stats())
