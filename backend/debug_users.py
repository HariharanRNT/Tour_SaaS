import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent

async def list_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"User: {u.email} | Role: {u.role}")

        result = await session.execute(select(Agent))
        agents = result.scalars().all()
        print(f"Total Agents: {len(agents)}")
        for a in agents:
            print(f"Agent: {a.domain}")

if __name__ == "__main__":
    asyncio.run(list_users())
