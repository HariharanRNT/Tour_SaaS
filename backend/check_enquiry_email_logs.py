import asyncio
from app.database import AsyncSessionLocal
from app.models import Enquiry
from app.models.email_log import EmailLog
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Get all recent enquiries with agent hariharan@reshandthosh.com
        result = await db.execute(
            select(Enquiry).where(Enquiry.agent_id == '87f499f5-01f0-4499-b9c1-142e387d8994')
            .order_by(Enquiry.created_at.desc()).limit(10)
        )
        enquiries = result.scalars().all()
        
        for e in enquiries:
            # Check if an email log exists for this enquiry
            log_result = await db.execute(
                select(EmailLog).where(
                    EmailLog.metadata_info['enquiry_id'].astext == str(e.id)
                )
            )
            logs = log_result.scalars().all()
            print(f"Enquiry: {str(e.id)[:8]} | email: {e.email} | email_logs: {len(logs)} | agent_notified: {e.agent_notified} | created: {e.created_at}")
            for log in logs:
                print(f"  -> EmailLog: {log.id} | Status: {log.status} | Subject: {log.subject[:60]}")

asyncio.run(main())
