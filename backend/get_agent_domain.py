import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def get_agent_domain():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT domain FROM agents WHERE user_id = 'ea672238-bd40-4c71-82b9-dc7a28ebdf6f'"))
        domain = result.scalar()
        print(domain)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_agent_domain())
