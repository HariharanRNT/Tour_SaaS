import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text

async def check_tables():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in res.fetchall()]
            print(f"Tables in database: {tables}")
            
            required_tables = ['packages', 'package_images', 'itinerary_items', 'package_availability']
            for table in required_tables:
                if table in tables:
                    print(f"SUCCESS: '{table}' table exists.")
                else:
                    print(f"FAILURE: '{table}' table is MISSING.")
    except Exception as e:
        print(f"Error checking tables: {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())
