
import asyncio
import os
import sys

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models import NotificationLog
from sqlalchemy import select

async def check_logs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10))
        logs = result.scalars().all()
        for log in logs:
            print(f"Log ID: {log.id}, Type: {log.type}, Status: {log.status}, Created: {log.created_at}")

if __name__ == "__main__":
    asyncio.run(check_logs())
