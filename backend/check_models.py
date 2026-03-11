from app.models import Package, Destination
from sqlalchemy import select
import asyncio
from app.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Package).limit(1)
            result = await session.execute(stmt)
            pkg = result.scalar_one_or_none()
            print("Package query successful")
            
            stmt2 = select(Destination).limit(1)
            result2 = await session.execute(stmt2)
            dest = result2.scalar_one_or_none()
            print("Destination query successful")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check())
