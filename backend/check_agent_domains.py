import asyncio
import logging
from app.database import AsyncSessionLocal
from app.models import Agent
from sqlalchemy import select

# Disable SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

async def check_domains():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Agent))
        agents = res.scalars().all()
        if not agents:
            print("No agents found in database.")
            return
        for a in agents:
            import json
            settings_str = json.dumps(a.homepage_settings, indent=2) if a.homepage_settings else "None"
            print(f"ID: {a.id}, Domain: {a.domain}, Agency: {a.agency_name}")
            print(f"Settings: {settings_str}")

if __name__ == "__main__":
    asyncio.run(check_domains())
