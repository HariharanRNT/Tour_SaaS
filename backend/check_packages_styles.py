import asyncio
from app.database import AsyncSessionLocal
from app.models import Package, PackageStatus
from sqlalchemy import select

async def check_packages():
    agent_id = "87f499f5-01f0-4499-b9c1-142e387d8994"
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Package).where(Package.created_by == agent_id))
        packages = result.scalars().all()
        print(f"Total packages for agent: {len(packages)}")
        for p in packages:
            print(f"ID: {p.id}, Title: {p.title}, Status: {p.status}, Trip Style (Legacy): {p.trip_style}")
            # Check relationships if possible
            from sqlalchemy.orm import selectinload
            res = await db.execute(select(Package).where(Package.id == p.id).options(selectinload(Package.trip_styles)))
            p_with_styles = res.scalar_one()
            styles = [s.name for s in p_with_styles.trip_styles]
            print(f"  Styles: {styles}")

if __name__ == "__main__":
    asyncio.run(check_packages())
