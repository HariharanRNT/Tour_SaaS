import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def check_logs():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id, type, status, error, created_at FROM notification_logs ORDER BY created_at DESC LIMIT 5"))
        for row in result.fetchall():
            print(f"{row[1]} | {row[2]} | {row[3]} | {row[4]}")

if __name__ == "__main__":
    asyncio.run(check_logs())
