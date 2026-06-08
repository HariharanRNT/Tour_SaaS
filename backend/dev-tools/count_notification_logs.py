import asyncio
from sqlalchemy import func, select
from app.database import AsyncSessionLocal
from app.models import NotificationLog

async def count_logs():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(NotificationLog.id)))
        print(f"Total NotificationLogs: {count}")
        
        # Also check last 5 with types
        stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(5)
        result = await session.execute(stmt)
        for log in result.scalars().all():
            print(f"ID: {log.id} | Type: {log.type} | Status: {log.status} | Created: {log.created_at}")

if __name__ == "__main__":
    asyncio.run(count_logs())
