import asyncio
import os
import sys
from sqlalchemy import text
from app.database import engine

async def fix_schema():
    print("Updating database schema...")
    async with engine.begin() as conn:
        # Add columns to packages
        await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS average_rating FLOAT DEFAULT NULL;"))
        await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0 NOT NULL;"))
        
        # Add columns to bookings
        await conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL;"))
        await conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;"))
        await conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;"))
        await conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_token VARCHAR(512) DEFAULT NULL;"))
        
        # Create any entirely new tables (like booking_reviews)
        from app.models import Base
        await conn.run_sync(Base.metadata.create_all)
        
    print("Database schema updated successfully!")

if __name__ == '__main__':
    asyncio.run(fix_schema())
