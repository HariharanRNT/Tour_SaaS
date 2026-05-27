import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.id, User.email))
        for row in result.all():
            if 'hari' in row[1].lower():
                print(f"User ID: {row[0]}, Email: {row[1]}")

asyncio.run(main())
