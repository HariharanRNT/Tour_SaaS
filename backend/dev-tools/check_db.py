import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text
import sys

async def check():
    with open("db_report.txt", "w") as f:
        try:
            async with AsyncSessionLocal() as db:
                f.write("Checking booking statuses...\n")
                res = await db.execute(text("SELECT DISTINCT status FROM bookings"))
                rows = res.all()
                f.write(f"Booking Statuses: {rows}\n")
                
                f.write("Checking payment statuses...\n")
                res = await db.execute(text("SELECT DISTINCT payment_status FROM bookings"))
                rows = res.all()
                f.write(f"Payment Statuses: {rows}\n")
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(check())
