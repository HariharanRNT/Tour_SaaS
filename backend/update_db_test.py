import asyncio
import json
from app.database import AsyncSessionLocal
from app.models import Agent
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

async def run():
    async with AsyncSessionLocal() as db:
        stmt = select(Agent).limit(1)
        r = await db.execute(stmt)
        agent = r.scalar_one_or_none()
        if agent:
            current_settings = agent.homepage_settings or {}
            current_settings['show_customer_reviews'] = False
            agent.homepage_settings = current_settings
            flag_modified(agent, 'homepage_settings')
            await db.commit()
            print("DB Updated! Current settings:", json.dumps(current_settings))
        else:
            print("Agent not found")

if __name__ == "__main__":
    asyncio.run(run())
