import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Agent, User

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Agent.user_id, Agent.domain, Agent.first_name, Agent.agency_name, User.email).join(User, Agent.user_id == User.id))
        for r in result:
            print(r)

asyncio.run(main())
