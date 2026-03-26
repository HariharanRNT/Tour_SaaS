import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def list_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT email, role FROM users"))
        rows = [dict(row._mapping) for row in result.fetchall()]
        print(f"USERS: {rows}")

if __name__ == "__main__":
    asyncio.run(list_users())
