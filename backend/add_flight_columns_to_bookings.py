"""Add missing flight columns to bookings table"""
import asyncio
import os
import sys

# Add the current directory to sys.path to import app modules
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database import engine

async def migrate():
    """Add flight_origin, flight_fare, flight_details columns to bookings"""
    async with engine.begin() as conn:
        print("Adding flight columns to bookings table...")
        
        # Add columns if they don't exist
        await conn.execute(text("""
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS flight_origin VARCHAR(50),
            ADD COLUMN IF NOT EXISTS flight_fare NUMERIC(10, 2),
            ADD COLUMN IF NOT EXISTS flight_details TEXT;
        """))
        
        print("Columns added successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
