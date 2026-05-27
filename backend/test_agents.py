import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Agent, User

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Agent, User.email).join(User, User.id == Agent.user_id))
        agents = result.all()
        for agent, email in agents:
            print(f'Email: {email}, Domain: {agent.domain}')

asyncio.run(main())
