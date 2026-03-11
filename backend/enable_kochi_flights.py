import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def update():
    db_url = os.getenv('DATABASE_URL')
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        # Update all Kochi packages
        origins = json.dumps(["Mumbai", "Delhi", "Bangalore", "Chennai"])
        result = await conn.execute(text("""
            UPDATE packages 
            SET flights_enabled = True, 
                is_public = True,
                flight_origin_cities = :origins,
                flight_cabin_class = 'ECONOMY',
                flight_price_included = False
            WHERE title LIKE '%Kochi%'
        """), {"origins": origins})
        print(f"Updated {result.rowcount} packages.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update())
