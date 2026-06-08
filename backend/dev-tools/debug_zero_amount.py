
import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import Booking, Package, Traveler

async def check_booking_details():
    async with AsyncSessionLocal() as db:
        # Check BKXYJ123456
        ref = "BKXYJ123456"
        stmt = select(Booking).where(Booking.booking_reference == ref)
        res = await db.execute(stmt)
        booking = res.scalar_one_or_none()
        
        if not booking:
            print(f"Booking {ref} not found.")
            return
            
        print(f"Booking: {ref} (ID: {booking.id})")
        print(f"  Status: {booking.status}")
        print(f"  Total Amount: {booking.total_amount}")
        print(f"  Number of Travelers: {booking.number_of_travelers}")
        
        # Check package
        pkg_stmt = select(Package).where(Package.id == booking.package_id)
        pkg_res = await db.execute(pkg_stmt)
        package = pkg_res.scalar_one_or_none()
        
        if package:
            print(f"  Package: {package.title} (Price per person: {package.price_per_person})")
        else:
            print("  Package not found!")
            
        # Check travelers
        trav_stmt = select(func.count(Traveler.id)).where(Traveler.booking_id == booking.id)
        trav_count = (await db.execute(trav_stmt)).scalar()
        print(f"  Traveler count from DB: {trav_count}")

if __name__ == "__main__":
    asyncio.run(check_booking_details())
