import asyncio
from app.database import engine
from app.models import Package, PackageStatus
from sqlalchemy import select, update

async def fix_salem():
    async with engine.begin() as conn:
        print("Checking for 'Salem Ad'...")
        result = await conn.execute(select(Package).where(Package.title.ilike('%Salem%')))
        pkgs = result.all()
        
        for p in pkgs:
            print(f"Found Package: {p.title}, ID: {p.id}")
            print(f"Current Status: {p.status}, Is Public: {p.is_public}")
            
            if not p.is_public:
                print("Fixing... Setting is_public=True")
                await conn.execute(
                    update(Package)
                    .where(Package.id == p.id)
                    .values(is_public=True, status=PackageStatus.PUBLISHED)
                )
                print("Fixed!")
            else:
                print("Already public.")

if __name__ == "__main__":
    asyncio.run(fix_salem())
