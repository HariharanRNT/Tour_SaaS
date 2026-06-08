import asyncio
import os
import sys
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal

async def fix():
    async with AsyncSessionLocal() as db:
        aid = '87f499f5-01f0-4499-b9c1-142e387d8994'
        print(f'Starting forced DB sync for Agent {aid}...')
        
        # 1. Enable Shimla for this agent
        await db.execute(text('UPDATE popular_destinations SET is_popular = True WHERE name = :name AND agent_id = :aid'), {'name': 'Shimla', 'aid': aid})
        
        # 2. Disable Tokyo for this agent
        await db.execute(text('UPDATE popular_destinations SET is_popular = False WHERE name = :name AND agent_id = :aid'), {'name': 'Tokyo', 'aid': aid})
        
        await db.commit()
        print('Database updated successfully.')

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(fix())
