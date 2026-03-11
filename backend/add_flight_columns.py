import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def migrate():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.begin() as conn:
        print("Adding flight columns to 'packages' table...")
        
        # Add columns if they don't exist
        await conn.execute(text("""
            ALTER TABLE packages 
            ADD COLUMN IF NOT EXISTS flights_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS flight_origin_cities TEXT DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS flight_cabin_class VARCHAR(20) DEFAULT 'ECONOMY',
            ADD COLUMN IF NOT EXISTS flight_price_included BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS flight_baggage_note TEXT;
        """))
        
        print("Columns added successfully.")

    await engine.dispose()
    print("\nMigration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
