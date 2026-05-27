import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.email_log import EmailLog

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).where(EmailLog.email_type == 'agent_enquiry_notification').order_by(EmailLog.created_at.desc()).limit(5))
        for obj in result.scalars().all():
            print(f"ID={obj.id}, CREATED={obj.created_at}, TO={obj.recipient_email}, META={obj.metadata_info}")

asyncio.run(main())
