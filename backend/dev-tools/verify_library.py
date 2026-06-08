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
        aid = '87f499f5-01f0-4499-b9c1-142e387d8994'
        print(f"--- Checking Activity Master logic for Agent {aid} ---")
        
        # 1. Activities
        r = await db.execute(text("SELECT DISTINCT destination_city FROM activities WHERE agent_id = :aid OR agent_id IS NULL"), {"aid": aid})
        act_cities = {row[0] for row in r.fetchall()}
        print(f"Cities from Activities: {act_cities}")
        
        # 2. Packages
        r = await db.execute(text("SELECT DISTINCT destination FROM packages WHERE created_by = :aid"), {"aid": aid})
        pkg_cities = {row[0] for row in r.fetchall()}
        print(f"Cities from Packages: {pkg_cities}")
        
        # 3. Metadata
        r = await db.execute(text("SELECT name FROM popular_destinations WHERE agent_id = :aid"), {"aid": aid})
        meta_cities = {row[0] for row in r.fetchall()}
        print(f"Cities from Metadata: {meta_cities}")
        
        union = act_cities | pkg_cities | meta_cities
        print(f"UNION (Total Library): {union}")
        
        print("\n--- Why is Shimla False? ---")
        r = await db.execute(text("SELECT * FROM popular_destinations WHERE name = 'Shimla' AND agent_id = :aid"), {"aid": aid})
        row = r.fetchone()
        if row:
            print(f"Shimla Record for Agent: {row}")
        else:
            print("No Shimla record for this agent found in Destination table.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
