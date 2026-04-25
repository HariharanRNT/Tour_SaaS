import asyncio
from app.database import AsyncSessionLocal
from app.models import Package, Destination
from sqlalchemy import select

async def check():
    session = AsyncSessionLocal()
    try:
        # Check Packages
        stmt = select(Package.destination, Package.status, Package.is_public, Package.created_by)
        res = await session.execute(stmt)
        print('Packages:')
        for r in res.all():
            print(f"Dest: '{r.destination}', Status: {r.status}, Public: {r.is_public}, Agent: {r.created_by}")
        
        # Check Destinations
        stmt2 = select(Destination.name, Destination.is_popular, Destination.is_active, Destination.agent_id)
        res2 = await session.execute(stmt2)
        print('\nDestinations:')
        for r in res2.all():
            print(f"Name: '{r.name}', Popular: {r.is_popular}, Active: {r.is_active}, Agent: {r.agent_id}")
            
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(check())
