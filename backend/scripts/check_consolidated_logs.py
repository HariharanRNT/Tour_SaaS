import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def check_consolidated_logs():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM notification_logs WHERE type = 'booking_success_consolidated'"))
        count = result.scalar()
        print(f"CONSOLIDATED_COUNT: {count}")
        
        if count > 0:
            result = await db.execute(text("SELECT status, error, created_at FROM notification_logs WHERE type = 'booking_success_consolidated' ORDER BY created_at DESC LIMIT 5"))
            for row in result.fetchall():
                print(f"{row[0]} | {row[1]} | {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_consolidated_logs())
