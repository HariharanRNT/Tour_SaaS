import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def get_agent_info():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT user_id, domain FROM agents LIMIT 5"))
        agents = result.fetchall()
        for agent in agents:
            print(f"Agent ID: {agent[0]}, Domain: {agent[1]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_agent_info())
