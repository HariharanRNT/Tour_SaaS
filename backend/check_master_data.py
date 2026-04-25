import asyncio
from app.database import AsyncSessionLocal
from app.models import TripStyle, ActivityTag
from sqlalchemy import select, or_

async def check_master_data():
    agent_id = "87f499f5-01f0-4499-b9c1-142e387d8994"
    async with AsyncSessionLocal() as db:
        # Trip Styles
        result = await db.execute(select(TripStyle).where(or_(TripStyle.agent_id == agent_id, TripStyle.agent_id == None)))
        styles = result.scalars().all()
        print("--- TRIP STYLES ---")
        for s in styles:
            print(f"ID: {s.id}, Name: {s.name}, Agent: {s.agent_id}")
            
        # Activity Tags
        result = await db.execute(select(ActivityTag).where(or_(ActivityTag.agent_id == agent_id, ActivityTag.agent_id == None)))
        tags = result.scalars().all()
        print("\n--- ACTIVITY TAGS ---")
        for t in tags:
            print(f"ID: {t.id}, Name: {t.name}, Agent: {t.agent_id}")

if __name__ == "__main__":
    asyncio.run(check_master_data())
