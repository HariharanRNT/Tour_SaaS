import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import NotificationLog

async def check_logs():
    async with AsyncSessionLocal() as session:
        stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10)
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        print(f"Checking last 10 notification logs:")
        for log in logs:
            print(f"ID: {log.id}, Type: {log.type}, Status: {log.status}, Created: {log.created_at}, Error: {log.error}")

if __name__ == "__main__":
    asyncio.run(check_logs())
