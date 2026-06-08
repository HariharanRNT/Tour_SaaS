import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Explicitly use the PostgreSQL URL from the .env file
DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def fix():
    async with AsyncSessionLocal() as db:
        # The agent ID for rnt.local which I found in diagnostics
        aid = '87f499f5-01f0-4499-b9c1-142e387d8994'
        print(f'Starting forced PostgreSQL DB sync for Agent {aid}...')
        
        # 1. Enable Shimla for this agent
        # We use an UPSERT style: update if exists, otherwise it might be better to just update 
        # because I verified it exists.
        res1 = await db.execute(text('UPDATE popular_destinations SET is_popular = True WHERE name = :name AND agent_id = :aid'), {'name': 'Shimla', 'aid': aid})
        print(f"Shimla updated: {res1.rowcount} rows")
        
        # 2. Disable Tokyo for this agent
        res2 = await db.execute(text('UPDATE popular_destinations SET is_popular = False WHERE name = :name AND agent_id = :aid'), {'name': 'Tokyo', 'aid': aid})
        print(f"Tokyo updated: {res2.rowcount} rows")
        
        # 3. Double check: are there ANY other 'Shimla' records for this agent that are False?
        # My previous grep saw some.
        
        await db.commit()
        print('Database updated successfully.')

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(fix())
