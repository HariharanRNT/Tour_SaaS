import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.email_log import EmailLog

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).where(EmailLog.id == 'e89ac087-9160-4497-95e0-3fc39d2788e3'))
        obj = result.scalar_one_or_none()
        if obj:
            print(f"Type: {obj.email_type}, Recipient: {obj.recipient_email}, Created At: {obj.created_at}")

asyncio.run(main())
