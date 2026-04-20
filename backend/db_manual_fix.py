import asyncio
import os
import sys
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal

async def fix():
    async with AsyncSessionLocal() as db:
        aid = '87f499f5-01f0-4499-b9c1-142e387d8994'
        print(f'Fixing Agent {aid}...')
        
        # 1. Ensure records exist (if they don't, we can skip or create, but they should exist from my previous check)
        
        # Enable Shimla
        res1 = await db.execute(text('UPDATE popular_destinations SET is_popular = True WHERE name = :name AND agent_id = :aid'), {'name': 'Shimla', 'aid': aid})
        print(f'Shimla rows affected: {res1.rowcount}')
        
        # Disable Tokyo
        res2 = await db.execute(text('UPDATE popular_destinations SET is_popular = False WHERE name = :name AND agent_id = :aid'), {'name': 'Tokyo', 'aid': aid})
        print(f'Tokyo rows affected: {res2.rowcount}')
        
        await db.commit()
        print('Database updated successfully.')

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(fix())
