import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
    if not db_url:
        print("DATABASE_URL not found")
        return
        
    conn = await asyncpg.connect(db_url)
    rows = await conn.fetch('SELECT id FROM trip_planning_sessions ORDER BY created_at DESC LIMIT 1')
    if rows:
        print(rows[0]['id'])
    else:
        print("No sessions found")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
