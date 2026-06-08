import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import Agent

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Agent))
        for obj in result.scalars().all():
            print(f"ID={obj.id}, DOMAIN={obj.domain}, EMAIL={obj.user.email if obj.user else None}")

asyncio.run(main())
