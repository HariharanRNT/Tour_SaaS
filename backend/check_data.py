"""Check existing data in PostgreSQL database"""
import asyncio
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import User, Package, Booking, Payment, Traveler, PackageImage, ItineraryItem, PackageAvailability


async def check_data():
    """Check what data exists in database"""
    async with AsyncSessionLocal() as session:
        print("="*60)
        print("DATABASE SUMMARY")
        print("="*60)
        
        # Count records in each table
        tables = [
            ("Users", User),
            ("Packages", Package),
            ("Package Images", PackageImage),
            ("Itinerary Items", ItineraryItem),
            ("Package Availability", PackageAvailability),
            ("Bookings", Booking),
            ("Travelers", Traveler),
            ("Payments", Payment),
        ]
        
        for table_name, model in tables:
            result = await session.execute(select(func.count(model.id)))
            count = result.scalar()
            print(f"{table_name:.<30} {count:>5} records")
        
        print("="*60)
        
        # Show sample users
        print("\nSAMPLE USERS:")
        print("-"*60)
        result = await session.execute(select(User).limit(10))
        users = result.scalars().all()
        for user in users:
            print(f"  {user.email:.<40} {user.role.value}")
        
        # Show sample packages
        print("\nSAMPLE PACKAGES:")
        print("-"*60)
        result = await session.execute(select(Package).limit(10))
        packages = result.scalars().all()
        for pkg in packages:
            print(f"  {pkg.title:.<40} ${pkg.price_per_person}")
        
        # Show sample bookings
        print("\nSAMPLE BOOKINGS:")
        print("-"*60)
        result = await session.execute(select(Booking).limit(10))
        bookings = result.scalars().all()
        for booking in bookings:
            print(f"  {booking.booking_reference:.<20} {booking.status.value:.<15} ${booking.total_amount}")
        
        print("\n" + "="*60)
        print("You can test the API with this data!")
        print("Login credentials:")
        print("  Admin: admin@toursaas.com / admin123")
        if len(users) > 1:
            print(f"  User:  {users[1].email} / password123")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(check_data())
