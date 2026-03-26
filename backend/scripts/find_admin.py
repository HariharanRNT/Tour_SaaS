import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def find_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT email FROM users WHERE role = 'ADMIN' LIMIT 1"))
        email = result.scalar()
        print(f"ADMIN_EMAIL: {email}")

if __name__ == "__main__":
    asyncio.run(find_admin())
