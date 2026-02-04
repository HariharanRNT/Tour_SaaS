
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, Package, Booking
from app.schemas import PackageResponse, BookingWithPackageResponse

async def check_data():
    async with AsyncSessionLocal() as db:
        # 1. Find user 'Arun'
        stmt = select(User).where(User.first_name == 'Arun')
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("User 'Arun' not found.")
            return
            
        print(f"User found: {user.first_name}")
        
        # 2. Check Packages
        print("\n--- Testing Package Serialization ---")
        stmt = select(Package).where(Package.created_by == user.id).options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability)
        )
        result = await db.execute(stmt)
        packages = result.scalars().all()
        print(f"Packages found: {len(packages)}")
        
        for p in packages:
            try:
                # Attempt Pydantic validation
                p_schema = PackageResponse.model_validate(p)
                print(f" [OK] Package '{p.title}' serialized successfully.")
            except Exception as e:
                print(f" [FAIL] Package '{p.title}' serialization failed: {e}")
            
        # 3. Check Bookings
        print("\n--- Testing Booking Serialization ---")
        stmt = select(Booking).where(Booking.agent_id == user.id).options(
            selectinload(Booking.package).options(
                selectinload(Package.images),
                selectinload(Package.itinerary_items),
                selectinload(Package.availability)
            ),
            selectinload(Booking.travelers),
            selectinload(Booking.user)
        )
        result = await db.execute(stmt)
        bookings = result.scalars().all()
        print(f"Bookings found: {len(bookings)}")
        
        for b in bookings:
            try:
                # Attempt Pydantic validation
                b_schema = BookingWithPackageResponse.model_validate(b)
                print(f" [OK] Booking '{b.booking_reference}' serialized successfully.")
            except Exception as e:
                print(f" [FAIL] Booking '{b.booking_reference}' serialization failed: {e}")

if __name__ == "__main__":
    asyncio.run(check_data())
