import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_bookings_table():
    queries = [
        "ALTER TABLE bookings ADD COLUMN review_count INTEGER DEFAULT 0 NOT NULL;",
        "ALTER TABLE bookings ADD COLUMN review_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL;",
        "ALTER TABLE bookings ADD COLUMN review_sent_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE bookings ADD COLUMN review_submitted_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE bookings ADD COLUMN review_token VARCHAR(512);",
        "CREATE UNIQUE INDEX ix_bookings_review_token ON bookings (review_token);",
        "ALTER TABLE bookings ADD COLUMN review_message TEXT;"
    ]
    
    for q in queries:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(q))
                print(f"Success: {q}")
        except Exception as e:
            print(f"Failed: {q} - {e}")

if __name__ == "__main__":
    asyncio.run(fix_bookings_table())
