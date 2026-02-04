import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding start_time column...")
        try:
            await conn.execute(text("ALTER TABLE itinerary_items ADD COLUMN start_time VARCHAR(20)"))
        except Exception as e:
            print(f"Skipping start_time (might exist): {e}")

        print("Adding end_time column...")
        try:
            await conn.execute(text("ALTER TABLE itinerary_items ADD COLUMN end_time VARCHAR(20)"))
        except Exception as e:
            print(f"Skipping end_time (might exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
