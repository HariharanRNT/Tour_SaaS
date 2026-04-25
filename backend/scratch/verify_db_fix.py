import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__) + "/../")

from app.database import engine
from sqlalchemy import text

async def run():
    print("Verifying if agents can be fetched...")
    async with engine.connect() as conn:
        try:
            result = await conn.execute(text("SELECT id, agency_name, website_pages_config FROM agents LIMIT 1;"))
            row = result.fetchone()
            if row:
                print(f"Success! Agent found: {row[1]}")
                print(f"website_pages_config: {row[2]}")
            else:
                print("No agents found in database.")
        except Exception as e:
            print(f"Verification failed: {e}")

if __name__ == "__main__":
    asyncio.run(run())
