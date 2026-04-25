import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent
from sqlalchemy import select

async def check_agents():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Agent))
        agents = result.scalars().all()
        for agent in agents:
            print(f"Agent ID: {agent.user_id}, Domain: {agent.domain}")

if __name__ == "__main__":
    asyncio.run(check_agents())
