import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'packages' AND column_name IN ('flights_enabled', 'flight_origin_cities');
        """))
        columns = result.fetchall()
        print(f"Existing columns in 'packages': {[c[0] for c in columns]}")

        if not columns:
             print("Flight columns are MISSING.")
        else:
             # Also check a few rows
             result = await conn.execute(text("SELECT title, flights_enabled FROM packages LIMIT 5"))
             rows = result.fetchall()
             print("Sample packages:")
             for row in rows:
                 print(f"Title: {row[0]}, Flights Enabled: {row[1]}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
