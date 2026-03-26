import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def count_logs():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM notification_logs"))
        count = result.scalar()
        print(f"COUNT: {count}")

if __name__ == "__main__":
    asyncio.run(count_logs())
