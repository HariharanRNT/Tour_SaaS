import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Enquiry

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Enquiry).where(Enquiry.id == 'e4e23421-a2a3-4882-912b-762703cf7286'))
        r = result.scalar_one_or_none()
        if r:
            print(f'Enquiry {r.id}: agent_id={r.agent_id}, status={r.status}, notif={r.agent_notified}, count={r.notification_count}')

asyncio.run(main())
