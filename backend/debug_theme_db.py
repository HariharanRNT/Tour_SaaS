import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import AgentTheme

async def inspect_db():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AgentTheme))
        themes = result.scalars().all()
        print(f"Found {len(themes)} themes.")
        for t in themes:
            print(f"ID: {t.id}, AgentID: {t.agent_id}, CreatedAt: {t.created_at}")

if __name__ == "__main__":
    asyncio.run(inspect_db())
