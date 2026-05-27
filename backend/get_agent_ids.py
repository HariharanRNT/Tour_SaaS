import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Agent.user_id, Agent.domain))
        for row in result.all():
            print(f"Agent User ID: {row[0]}, Domain: {row[1]}")

asyncio.run(main())
