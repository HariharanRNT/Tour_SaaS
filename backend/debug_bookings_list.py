import asyncio
from dotenv import load_dotenv
load_dotenv("backend/.env")

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import engine
from app.models import Booking
from app.schemas import BookingWithPackageResponse
from app.database import AsyncSessionLocal

async def check_bookings():
    async with AsyncSessionLocal() as db:
        print("Fetching all bookings...")
        # Import Package for relation loading
        from app.models import Package
        query = select(Booking).options(
            selectinload(Booking.package).selectinload(Package.images),
            selectinload(Booking.package).selectinload(Package.itinerary_items),
            selectinload(Booking.package).selectinload(Package.availability),
            selectinload(Booking.travelers)
        )
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        print(f"Found {len(bookings)} bookings.")
        
        for i, b in enumerate(bookings):
            try:
                print(f"Validating Booking ID: {b.id}")
                # Check relations manually first
                if not b.package:
                    print(f"  [WARNING] Booking {b.id} has NO PACKAGE association!")
                else:
                    print(f"  Package: {b.package.title}")
                    
                BookingWithPackageResponse.model_validate(b)
                print("  [OK] Validation passed.")
            except Exception as e:
                print(f"  [ERROR] Validation FAILED for {b.id}:")
                print(f"  {e}")

if __name__ == "__main__":
    asyncio.run(check_bookings())
