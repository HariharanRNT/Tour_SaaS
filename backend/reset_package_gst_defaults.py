"""Migration: Reset packages with DB-default GST values to NULL so they use agent settings"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.begin() as conn:
        # Change the default to NULL so new packages start as "not configured"
        await conn.execute(text('ALTER TABLE packages ALTER COLUMN gst_applicable SET DEFAULT NULL'))
        await conn.execute(text('ALTER TABLE packages ALTER COLUMN gst_mode SET DEFAULT NULL'))
        await conn.execute(text('ALTER TABLE packages ALTER COLUMN gst_percentage SET DEFAULT NULL'))
        print("Changed column defaults to NULL")

        # Reset packages that still have the original DB defaults
        # (gst_applicable=FALSE, gst_mode='exclusive', gst_percentage=18)
        # These were never explicitly configured, so NULL is correct
        result = await conn.execute(text("""
            UPDATE packages
            SET gst_applicable = NULL, gst_percentage = NULL, gst_mode = NULL
            WHERE gst_applicable = FALSE
              AND (gst_mode = 'exclusive' OR gst_mode IS NULL)
              AND (gst_percentage = 18 OR gst_percentage IS NULL)
        """))
        print(f"Reset {result.rowcount} package(s) to NULL GST (will use agent defaults when editing)")

    await engine.dispose()
    print("\nMigration complete!")

if __name__ == "__main__":
    asyncio.run(main())
