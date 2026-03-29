import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import NotificationLog

async def check_logs():
    async with AsyncSessionLocal() as session:
        stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(10)
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        if not logs:
            print("No notification logs found.")
            return

        print(f"ID | Type | Status | Error")
        print("-" * 60)
        for log in logs:
            error_preview = (log.error[:50] + "...") if log.error and len(log.error) > 50 else log.error
            print(f"{log.id} | {log.type} | {log.status} | {error_preview}")

if __name__ == "__main__":
    asyncio.run(check_logs())
