import sys
import os
import asyncio

# Add backend directory to sys.path
sys.path.append(os.path.abspath('d:/Hariharan/G-Project/RNT_Tour/backend'))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(text("UPDATE packages SET advance_cancellation_enabled = true WHERE id = '22d0c4c7-c57f-47ce-a93d-575bc6adda1d'"))
        await session.commit()
        result = await session.execute(text("SELECT id, advance_cancellation_enabled FROM packages WHERE id = '22d0c4c7-c57f-47ce-a93d-575bc6adda1d'"))
        row = result.fetchone()
        print(f"Updated: {row[0]}, advance_cancellation_enabled: {row[1]}")

if __name__ == "__main__":
    asyncio.run(main())
