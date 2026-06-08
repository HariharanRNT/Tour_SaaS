
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Enquiry

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Enquiry).where(Enquiry.id == 'c33534fd-2e2b-4187-b70b-bdb282bc7037'))
        enq = result.scalar_one_or_none()
        if enq:
            print('Enquiry Confirmed Files:', enq.confirmation_files)

asyncio.run(check())

