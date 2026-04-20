import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with AsyncSessionLocal() as db:
        print("1. Checking Agent for rnt.local")
        stmt = text("SELECT user_id, domain FROM agents WHERE domain = 'rnt.local' OR domain LIKE '%rnt.local%'")
        res = await db.execute(stmt)
        agent = res.fetchone()
        if agent:
            print(f"Found Agent ID: {agent.user_id} for domain {agent.domain}")
            aid = agent.user_id
            
            print("\n2. Checking Destination overrides for this agent")
            stmt = text("SELECT name, is_popular, is_active FROM popular_destinations WHERE agent_id = :aid AND name IN ('Shimla', 'Tokyo', 'Simal')")
            res = await db.execute(stmt, {"aid": aid})
            for row in res.fetchall():
                print(f"Name: {row.name} | Popular: {row.is_popular} | Active: {row.is_active}")
        else:
            print("No agent found for domain 'rnt.local'")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
