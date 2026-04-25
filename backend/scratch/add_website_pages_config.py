import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__) + "/../")

from app.database import engine
from sqlalchemy import text

async def run():
    print("Checking and adding missing columns...")
    async with engine.begin() as conn:
        try:
            # Check if column exists
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='agents' AND column_name='website_pages_config';
            """)
            result = await conn.execute(check_sql)
            exists = result.scalar() is not None
            
            if not exists:
                print("Adding column website_pages_config to agents table...")
                # Add column as JSONB (Postgres)
                await conn.execute(text("ALTER TABLE agents ADD COLUMN website_pages_config JSONB DEFAULT '{}'::jsonb;"))
                print("Column added successfully.")
            else:
                print("Column website_pages_config already exists.")
        except Exception as e:
            print(f"Error updating database: {e}")

if __name__ == "__main__":
    asyncio.run(run())
