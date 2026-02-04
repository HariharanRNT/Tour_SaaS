"""Add tripjack_booking_id column to bookings table"""
import asyncio
from dotenv import load_dotenv
load_dotenv("backend/.env")

from sqlalchemy import text
from app.database import engine

async def migrate():
    """Add tripjack_booking_id and tripjack_status column"""
    async with engine.begin() as conn:
        print("Adding tripjack_booking_id column to bookings...")
        await conn.execute(text("""
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS tripjack_booking_id VARCHAR(50)
        """))
        print("Column added successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
