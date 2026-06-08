import asyncio
import json
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.email_log import EmailLog

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailLog).order_by(EmailLog.created_at.desc()).limit(10))
        for obj in result.scalars().all():
            print(f"ID={obj.id}, TYPE={obj.email_type}, META={obj.metadata_info}")

asyncio.run(main())
