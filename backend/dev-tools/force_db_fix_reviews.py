import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_bookings_table():
    async with engine.begin() as conn:
        try:
            print("Adding review_count column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_count INTEGER DEFAULT 0 NOT NULL;"))
        except Exception as e:
            print(f"Skipped review_count: {e}")

        try:
            print("Adding review_status column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;"))
        except Exception as e:
            print(f"Skipped review_status: {e}")

        try:
            print("Adding review_sent_at column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_sent_at TIMESTAMP WITH TIME ZONE;"))
        except Exception as e:
            print(f"Skipped review_sent_at: {e}")

        try:
            print("Adding review_submitted_at column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_submitted_at TIMESTAMP WITH TIME ZONE;"))
        except Exception as e:
            print(f"Skipped review_submitted_at: {e}")

        try:
            print("Adding review_token column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_token VARCHAR(512);"))
            await conn.execute(text("CREATE UNIQUE INDEX ix_bookings_review_token ON bookings (review_token);"))
        except Exception as e:
            print(f"Skipped review_token: {e}")

        try:
            print("Adding review_message column...")
            await conn.execute(text("ALTER TABLE bookings ADD COLUMN review_message TEXT;"))
        except Exception as e:
            print(f"Skipped review_message: {e}")

        print("Done fixing bookings table.")

if __name__ == "__main__":
    asyncio.run(fix_bookings_table())
