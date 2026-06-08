import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import NotificationLog
import json

async def check_notification_logs():
    async with AsyncSessionLocal() as session:
        stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10)
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        if not logs:
            print("No notification logs found.")
            return
            
        print(f"{'ID':<40} | {'Type':<20} | {'Status':<10} | {'Error'}")
        print("-" * 100)
        for log in logs:
            print(f"{str(log.id):<40} | {log.type:<20} | {log.status:<10} | {log.error}")

if __name__ == "__main__":
    asyncio.run(check_notification_logs())
