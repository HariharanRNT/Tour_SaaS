import asyncio
from app.database import AsyncSessionLocal
from app.models import Enquiry, Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Enquiry).order_by(Enquiry.created_at.desc()).limit(5))
        for e in result.scalars().all():
            agent_res = await db.execute(select(User.email).where(User.id == e.agent_id))
            agent_email = agent_res.scalar_one_or_none()
            print(f"Enquiry: {e.id} | agent_id: {e.agent_id} | agent_email: {agent_email} | created: {e.created_at}")

asyncio.run(main())
