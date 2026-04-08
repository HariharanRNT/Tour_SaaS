import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

# Database URL from .env (retrieved earlier)
DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def migrate():
    print(f"Connecting to: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Checking/Adding 'type' column to 'travelers' table...")
        try:
            # PostgreSQL syntax to add column if not exists
            await conn.execute(text("ALTER TABLE travelers ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'ADULT'"))
            print("Successfully added 'type' column (or it already existed).")
        except Exception as e:
            print(f"Error during migration: {e}")
            
    await engine.dispose()
    print("Database migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
