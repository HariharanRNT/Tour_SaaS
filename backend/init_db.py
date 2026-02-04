"""Script to create database tables"""
import asyncio
from app.database import engine, Base
from app.models import (
    User, Package, PackageImage, ItineraryItem,
    PackageAvailability, Booking, Traveler, Payment
)


async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        # Drop all tables (for development)
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("[OK] Database tables created successfully!")


if __name__ == "__main__":
    asyncio.run(create_tables())
