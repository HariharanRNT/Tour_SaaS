import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
import os

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def get_package_id():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT id FROM packages WHERE status = 'PUBLISHED' LIMIT 1"))
        package_id = result.scalar()
        print(package_id)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_package_id())
