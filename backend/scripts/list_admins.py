import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def list_admins():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT email FROM users WHERE role = 'ADMIN'"))
        emails = [row[0] for row in result.fetchall()]
        print(f"ADMIN_EMAILS: {emails}")

if __name__ == "__main__":
    asyncio.run(list_admins())
