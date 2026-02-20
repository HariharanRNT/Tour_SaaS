import asyncio
from app.database import engine, Base
from app.models import AgentTheme

async def create_agent_theme_table():
    async with engine.begin() as conn:
        print("Ensuring all tables exist (including expanded agent_themes)...")
        # Base.metadata.create_all is additive and won't drop existing data
        await conn.run_sync(Base.metadata.create_all)
        print("Schema ensured successfully.")

if __name__ == "__main__":
    asyncio.run(create_agent_theme_table())
