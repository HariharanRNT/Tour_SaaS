import asyncio
import sys
sys.path.insert(0, 'd:/Hariharan/G-Project/RNT_Tour/backend')
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Package
from app.schemas import PackageResponse
import json

async def main():
    async with AsyncSessionLocal() as session:
        # Load the package as the API would
        stmt = select(Package).options(
            selectinload(Package.itinerary_items),
            selectinload(Package.images),
            selectinload(Package.availability),
            selectinload(Package.trip_styles),
            selectinload(Package.activity_tags)
        ).where(Package.id == '22d0c4c7-c57f-47ce-a93d-575bc6adda1d')
        result = await session.execute(stmt)
        package = result.scalar_one_or_none()
        
        print("=== ORM MODEL VALUES ===")
        print(f"advance_cancellation_enabled: {package.advance_cancellation_enabled}")
        print(f"split_payment_enabled: {package.split_payment_enabled}")
        print(f"cancellation_enabled: {package.cancellation_enabled}")
        
        print("\n=== SCHEMA SERIALIZATION ===")
        resp = PackageResponse.model_validate(package)
        resp_dict = resp.model_dump()
        print(f"advance_cancellation_enabled: {resp_dict['advance_cancellation_enabled']}")
        print(f"split_payment_enabled: {resp_dict['split_payment_enabled']}")
        print(f"cancellation_enabled: {resp_dict['cancellation_enabled']}")
        
        print("\n=== FULL JSON OUTPUT (relevant fields only) ===")
        relevant = {k: v for k, v in resp_dict.items() if 'cancel' in k.lower() or 'split' in k.lower() or 'advance' in k.lower()}
        print(json.dumps(relevant, default=str, indent=2))

asyncio.run(main())
