import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def get_active_agent_with_domain():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        # Get active subscription user ids
        sub_res = await session.execute(text("SELECT user_id FROM subscriptions WHERE status = 'active'"))
        active_user_ids = [row[0] for row in sub_res.fetchall()]
        
        if not active_user_ids:
            print("No active subscriptions found")
            return
            
        # Get agents with domain among active users
        ids_str = ", ".join([f"'{uid}'" for uid in active_user_ids])
        agent_res = await session.execute(text(f"SELECT user_id, domain FROM agents WHERE user_id IN ({ids_str}) AND domain IS NOT NULL AND domain != 'localhost'"))
        agents = agent_res.fetchall()
        for agent in agents:
            print(f"Agent ID: {agent[0]}, Domain: {agent[1]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_active_agent_with_domain())
