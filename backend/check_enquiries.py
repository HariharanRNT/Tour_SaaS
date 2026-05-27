import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Enquiry

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Enquiry).order_by(Enquiry.created_at.desc()).limit(5))
        for obj in result.scalars().all():
            print(f"ID={obj.id}, CREATED={obj.created_at}, AGENT={obj.agent_id}")

asyncio.run(main())
