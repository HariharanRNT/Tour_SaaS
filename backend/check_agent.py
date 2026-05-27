import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Check domain for agent 23773f6e
        result = await db.execute(select(Agent.domain, Agent.user_id, User.email).join(User, Agent.user_id == User.id).where(Agent.user_id == '23773f6e-42ed-4052-92e2-0680f41e331e'))
        for row in result.all():
            print(f"agent_id: {row.user_id}, Domain: {row.domain}, Email: {row.email}")

asyncio.run(main())
