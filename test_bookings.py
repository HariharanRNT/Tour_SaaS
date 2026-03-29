
import asyncio
import os
import sys

# Add the backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.database import AsyncSessionLocal
from app.models import User, UserRole, Booking, Package, BookingRefund
from app.schemas import BookingWithPackageResponse
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID

async def test():
    async with AsyncSessionLocal() as db:
        try:
            print("Checking database connection...")
            # Fetch bookings with all relations
            stmt = select(Booking).limit(1).options(
                selectinload(Booking.package).options(
                    selectinload(Package.images),
                    selectinload(Package.itinerary_items),
                    selectinload(Package.availability),
                    selectinload(Package.dest_metadata)
                ),
                selectinload(Booking.travelers),
                selectinload(Booking.user),
                selectinload(Booking.refund)
            )
            result = await db.execute(stmt)
            bookings = result.scalars().all()
            
            if not bookings:
                print("No bookings found in DB to test.")
                return

            for b in bookings:
                try:
                    print(f"\nValidating booking {b.id} ({b.booking_reference})...")
                    BookingWithPackageResponse.model_validate(b)
                    print(f"Booking {b.id} is VALID")
                except Exception as ve:
                    print(f"FAILED on booking {b.id}:")
                    if hasattr(ve, 'json'):
                        print(ve.json(indent=2))
                    else:
                        print(ve)
            
        except Exception as e:
            print(f"Error during execution: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
