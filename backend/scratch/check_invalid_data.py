import asyncio
import os
import sys
from uuid import UUID

# Add backend to path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Package

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Package).where(Package.duration_days < 1))
        pkgs = res.scalars().all()
        print(f"Found {len(pkgs)} packages with duration_days < 1")
        for p in pkgs:
            print(f" - {p.title} (ID: {p.id}, days: {p.duration_days})")

if __name__ == "__main__":
    asyncio.run(check())
