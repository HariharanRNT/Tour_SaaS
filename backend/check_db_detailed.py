import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text
from app.models import Booking

async def check():
    with open("db_report_detailed.txt", "w") as f:
        try:
            async with AsyncSessionLocal() as db:
                f.write("Checking 5 sample bookings...\n")
                res = await db.execute(text("SELECT id, booking_reference, package_id, user_id, agent_id, status FROM bookings LIMIT 5"))
                rows = res.all()
                for r in rows:
                    f.write(f"Booking: {r}\n")
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(check())
