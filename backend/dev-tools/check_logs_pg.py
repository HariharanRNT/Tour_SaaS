import asyncio
import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import NotificationLog
from sqlalchemy import select

async def get_logs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10)
        )
        logs = result.scalars().all()
        with open('log_diagnostic.txt', 'w') as f:
            for log in logs:
                f.write(f"ID: {log.id}, Type: {log.type}, Status: {log.status}, Error: {log.error}, Created: {log.created_at}\n")

if __name__ == "__main__":
    asyncio.run(get_logs())
