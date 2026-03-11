import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_columns():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'packages';
        """))
        columns = [row[0] for row in result.fetchall()]
        print("Existing columns in 'packages' table:")
        for col in sorted(columns):
            print(f" - {col}")
            
        flight_cols = ['flights_enabled', 'flight_origin_cities', 'flight_cabin_class', 'flight_price_included', 'flight_baggage_note']
        missing = [c for c in flight_cols if c not in columns]
        
        if missing:
            print("\nMissing flight-related columns:")
            for m in missing:
                print(f" [MISSING] {m}")
        else:
            print("\nAll flight-related columns are present.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_columns())
