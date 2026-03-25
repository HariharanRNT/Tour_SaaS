import asyncio
import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import Booking
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_booking(ref):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.agent))
            .where(Booking.booking_reference == ref)
        )
        booking = result.scalar_one_or_none()
        with open('booking_data.txt', 'w') as f:
            if not booking:
                f.write(f"Booking {ref} not found.")
                return
                
            f.write(f"Booking Reference: {booking.booking_reference}\n")
            f.write(f"Customer Email: {booking.user.email if booking.user else 'N/A'}\n")
            f.write(f"Agent Email: {booking.agent.email if booking.agent else 'N/A'}\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(check_booking(sys.argv[1]))
    else:
        print("Provide booking reference.")
