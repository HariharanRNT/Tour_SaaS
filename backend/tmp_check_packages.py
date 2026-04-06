import asyncio
import os
import sys

# Add the current directory to sys.path to find the app module
sys.path.append(os.getcwd())

from app.database import get_db
from app.models import Package
from sqlalchemy import select

async def run():
    async for db in get_db():
        stmt = select(Package).where(Package.package_mode == 'multi')
        result = await db.execute(stmt)
        pkgs = result.scalars().all()
        if pkgs:
            for pkg in pkgs:
                print(f'Multi-city package found: {pkg.title} | ID: {pkg.id} | Destination: "{pkg.destination}"')
        else:
            print('No multi-city package found')
        break

if __name__ == "__main__":
    asyncio.run(run())
