import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.email_log import EmailLog

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).order_by(EmailLog.created_at.desc()).limit(15))
        for obj in result.scalars().all():
            print(f"TYPE={obj.email_type}, SENDER_TYPE={obj.sender_type}, TO={obj.recipient_email}")

asyncio.run(main())
