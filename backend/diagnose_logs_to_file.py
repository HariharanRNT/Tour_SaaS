import asyncio
from sqlalchemy import func, select
from app.database import AsyncSessionLocal
from app.models import NotificationLog

async def count_logs():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(NotificationLog.id)))
        output = f"Total NotificationLogs: {count}\n"
        
        stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10)
        result = await session.execute(stmt)
        for log in result.scalars().all():
            output += f"ID: {log.id} | Type: {log.type} | Status: {log.status} | Created: {log.created_at} | Error: {log.error}\n"
        
        with open("log_diagnostics.txt", "w") as f:
            f.write(output)
        print("Wrote diagnostics to log_diagnostics.txt")

if __name__ == "__main__":
    asyncio.run(count_logs())
