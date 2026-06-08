import asyncio
from app.database import AsyncSessionLocal
from app.models.email_log import EmailLog
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).order_by(EmailLog.created_at.desc()).limit(8))
        for log in result.scalars().all():
            print(f"ID: {log.id} | Type: {log.email_type} | To: {log.recipient_email} | Status: {log.status} | Created: {log.created_at}")

asyncio.run(main())
