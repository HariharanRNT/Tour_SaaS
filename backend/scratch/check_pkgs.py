import asyncio
from app.database import engine, AsyncSession
from app.models import Package
from sqlalchemy import select

async def check():
    async with AsyncSession(engine) as db:
        res = await db.execute(select(Package).where(Package.gst_mode == 'inclusive').limit(5))
        pkgs = res.scalars().all()
        for p in pkgs:
            print(f'Title: {p.title}, Price: {p.price_per_person}, GST: {p.gst_percentage}, Mode: {p.gst_mode}')

if __name__ == "__main__":
    asyncio.run(check())
