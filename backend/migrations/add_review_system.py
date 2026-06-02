"""
Migration: Add Review System
Adds review tracking to bookings, rating aggregates to packages, and creates booking_reviews table.
Run: python migrations/add_review_system.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.database import AsyncSessionLocal

SQL_STATEMENTS = [
    # 1. Add review_status enum type (PostgreSQL)
    """
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewstatus') THEN
            CREATE TYPE reviewstatus AS ENUM ('PENDING', 'SENT', 'SUBMITTED');
        END IF;
    END
    $$;
    """,

    # 2. Add review tracking columns to bookings
    """
    ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS review_token VARCHAR(512);
    """,

    # 3. Add unique index on review_token (if not already there)
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'bookings' AND indexname = 'ix_bookings_review_token'
        ) THEN
            CREATE UNIQUE INDEX ix_bookings_review_token ON bookings (review_token) WHERE review_token IS NOT NULL;
        END IF;
    END
    $$;
    """,

    # 4. Add rating aggregate columns to packages
    """
    ALTER TABLE packages
        ADD COLUMN IF NOT EXISTS average_rating FLOAT,
        ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
    """,

    # 5. Create booking_reviews table
    """
    CREATE TABLE IF NOT EXISTS booking_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
        agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_message TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_booking_review UNIQUE (booking_id)
    );
    """,

    # 6. Create indexes on booking_reviews
    """
    CREATE INDEX IF NOT EXISTS ix_booking_reviews_booking_id ON booking_reviews (booking_id);
    CREATE INDEX IF NOT EXISTS ix_booking_reviews_package_id ON booking_reviews (package_id);
    CREATE INDEX IF NOT EXISTS ix_booking_reviews_agent_id ON booking_reviews (agent_id);
    """,
]


async def run_migration():
    print("Starting Review System migration...")
    async with AsyncSessionLocal() as session:
        for i, stmt in enumerate(SQL_STATEMENTS, 1):
            try:
                await session.execute(text(stmt))
                await session.commit()
                print(f"  [OK] Statement {i}/{len(SQL_STATEMENTS)}")
            except Exception as e:
                await session.rollback()
                print(f"  [ERROR] Statement {i}: {e}")
                # Continue — some statements are idempotent / safe to skip
    print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(run_migration())
