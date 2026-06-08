import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def get_active_subscriptions():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT user_id FROM subscriptions WHERE status = 'active' LIMIT 5"))
        subs = result.fetchall()
        for sub in subs:
            # Join with agents to get domain
            res = await session.execute(text(f"SELECT domain FROM agents WHERE user_id = '{sub[0]}'"))
            domain = res.scalar()
            print(f"Agent ID: {sub[0]}, Domain: {domain}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_active_subscriptions())
