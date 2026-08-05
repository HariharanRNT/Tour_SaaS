import sys
import os
import asyncio
sys.path.append(os.path.abspath('d:/Hariharan/G-Project/RNT_Tour/backend'))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Package
from app.schemas import PackageResponse

async def main():
    async with AsyncSessionLocal() as session:
        stmt = select(Package).where(Package.id == '22d0c4c7-c57f-47ce-a93d-575bc6adda1d')
        result = await session.execute(stmt)
        package = result.scalar_one_or_none()
        
        if package:
            resp = PackageResponse.model_validate(package)
            print("Response Dict:")
            print(resp.model_dump(include={'advance_cancellation_enabled'}))
        else:
            print("Package not found")

if __name__ == "__main__":
    asyncio.run(main())
