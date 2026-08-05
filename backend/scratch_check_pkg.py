import sys
import os
import asyncio

# Add backend directory to sys.path
sys.path.append(os.path.abspath('d:/Hariharan/G-Project/RNT_Tour/backend'))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, title, cancellation_enabled, advance_cancellation_enabled FROM packages WHERE id = '22d0c4c7-c57f-47ce-a93d-575bc6adda1d'"))
        row = result.fetchone()
        if row:
            print(f"ID: {row[0]}, Title: {row[1]}, cancellation_enabled: {row[2]}, advance_cancellation_enabled: {row[3]}")
        else:
            print("Package not found")

if __name__ == "__main__":
    asyncio.run(main())
