import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Test what happens with domain 'localhost' or fallback
        result = await db.execute(select(Agent).limit(1))
        agent = result.scalar_one_or_none()
        print(f"First agent returned by 'select Agent limit 1': user_id={agent.user_id}, domain={agent.domain}")

asyncio.run(main())
