import asyncio
from app.database import AsyncSessionLocal
from app.models import Enquiry
from app.models.email_log import EmailLog
from sqlalchemy import select, cast
from sqlalchemy.dialects.postgresql import JSONB

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Enquiry).where(Enquiry.agent_id == '87f499f5-01f0-4499-b9c1-142e387d8994')
            .order_by(Enquiry.created_at.desc()).limit(6)
        )
        enquiries = result.scalars().all()
        
        for e in enquiries:
            log_result = await db.execute(
                select(EmailLog).where(
                    EmailLog.metadata_info.op('->>')(cast('enquiry_id', JSONB)) == str(e.id)
                )
            )
            logs = log_result.scalars().all()
            print(f"Enquiry: {str(e.id)[:8]} | logs: {len(logs)} | notified: {e.agent_notified} | created: {e.created_at}")
            for log in logs:
                print(f"  -> Status: {log.status}")

asyncio.run(main())
