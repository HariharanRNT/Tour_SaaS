import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from app.models import Base

async def run():
    print("Creating missing tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Migration successful.")

if __name__ == "__main__":
    asyncio.run(run())
