
import asyncio
from sqlalchemy import text
from app.database import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding gst_inclusive column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS gst_inclusive BOOLEAN DEFAULT FALSE"))
            print("Successfully added gst_inclusive column")
        except Exception as e:
            print(f"Error adding gst_inclusive: {e}")

        print("Adding gst_percentage column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5, 2) DEFAULT 18.00"))
            print("Successfully added gst_percentage column")
        except Exception as e:
            print(f"Error adding gst_percentage: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
