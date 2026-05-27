import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Agent.domain, User.email).join(User, Agent.user_id == User.id))
        for row in result.all():
            print(f"Domain: {row[0]}, Email: {row[1]}")

asyncio.run(main())
