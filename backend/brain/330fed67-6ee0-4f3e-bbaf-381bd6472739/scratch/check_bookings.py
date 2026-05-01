
import asyncio
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import Booking, User, Agent

async def check_bookings():
    async with AsyncSessionLocal() as db:
        # Check Bookings
        stmt = select(Booking)
        result = await db.execute(stmt)
        bookings = result.scalars().all()
        print(f"Total Bookings in DB: {len(bookings)}")
        for b in bookings:
            print(f"Booking ID: {b.id}, Status: {b.status}, Created At: {b.created_at}")

if __name__ == "__main__":
    asyncio.run(check_bookings())
