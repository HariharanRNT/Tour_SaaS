"""
Test to simulate what the browser GET request returns.
This directly mimics the FastAPI endpoint response serialization.
"""
import asyncio
import sys
import json
sys.path.insert(0, 'd:/Hariharan/G-Project/RNT_Tour/backend')
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Package
from app.schemas import PackageResponse

async def main():
    async with AsyncSessionLocal() as session:
        pkg_id = '22d0c4c7-c57f-47ce-a93d-575bc6adda1d'
        stmt = select(Package).options(
            selectinload(Package.itinerary_items),
            selectinload(Package.images),
            selectinload(Package.availability),
            selectinload(Package.trip_styles),
            selectinload(Package.activity_tags)
        ).where(Package.id == pkg_id)
        result = await session.execute(stmt)
        package = result.scalar_one_or_none()
        
        if package:
            # Simulate the FastAPI JSON serialization
            resp = PackageResponse.model_validate(package)
            # model_dump mimics JSON serialization
            data = resp.model_dump(mode='json')
            
            print("=== SIMULATED JSON RESPONSE ===")
            print("advance_cancellation_enabled:", data.get('advance_cancellation_enabled'))
            print("split_payment_enabled:", data.get('split_payment_enabled'))
            print("cancellation_enabled:", data.get('cancellation_enabled'))
            print("split_payment_mode:", data.get('split_payment_mode'))
            print("advance_payment_type:", data.get('advance_payment_type'))
            print("advance_payment_value:", data.get('advance_payment_value'))
            print("\nAll fields with 'cancel' or 'split' in name:")
            for k, v in data.items():
                if 'cancel' in k or 'split' in k or 'advance' in k:
                    print(f"  {k}: {v!r}")

asyncio.run(main())
