import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.email_log import EmailLog
import json

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).where(EmailLog.email_type == 'agent_cancellation_alert').order_by(EmailLog.created_at.desc()).limit(10))
        for obj in result.scalars().all():
            print(f"ID={obj.id}, TIME={obj.created_at}, HTML={obj.html_body[:30]}...")

asyncio.run(main())
