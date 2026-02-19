
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

# Get DB URL from env or hardcode consistent with project
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost/tour_saas"

async def update_schema():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Adding gst_inclusive column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN gst_inclusive BOOLEAN DEFAULT FALSE"))
            print("Successfully added gst_inclusive column")
        except Exception as e:
            print(f"Error adding gst_inclusive: {e}")

        print("Adding gst_percentage column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN gst_percentage NUMERIC(5, 2) DEFAULT 18.00"))
            print("Successfully added gst_percentage column")
        except Exception as e:
            print(f"Error adding gst_percentage: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
