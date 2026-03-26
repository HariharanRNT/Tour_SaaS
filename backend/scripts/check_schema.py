import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def check_schema():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'notification_logs'"))
        for row in result.fetchall():
            print(f"{row[0]} | {row[1]} | {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_schema())
