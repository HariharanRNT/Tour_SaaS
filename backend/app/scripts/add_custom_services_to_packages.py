
import asyncio
from sqlalchemy import text
from app.database import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding custom_services column to packages table...")
        try:
            # Using JSONB if possible (PostgreSQL), but JSON is safe
            await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS custom_services JSON DEFAULT '[]'"))
            print("Successfully added custom_services column")
        except Exception as e:
            print(f"Error adding custom_services: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
