"""Migration: Add per-package GST columns to packages table"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.begin() as conn:
        print("Adding gst_applicable column...")
        try:
            await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT FALSE"))
            print("  OK: gst_applicable")
        except Exception as e:
            print(f"  Error: {e}")

        print("Adding gst_percentage column...")
        try:
            await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5, 2) DEFAULT 18.00"))
            print("  OK: gst_percentage")
        except Exception as e:
            print(f"  Error: {e}")

        print("Adding gst_mode column...")
        try:
            await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS gst_mode VARCHAR(20) DEFAULT 'exclusive'"))
            print("  OK: gst_mode")
        except Exception as e:
            print(f"  Error: {e}")

    await engine.dispose()
    print("\nMigration complete!")

if __name__ == "__main__":
    asyncio.run(main())
