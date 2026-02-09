import asyncio
from app.database import engine, Base
from app.models import UserOTP

async def create_tables():
    async with engine.begin() as conn:
        print("Creating UserOTP table...")
        await conn.run_sync(Base.metadata.create_all)
        print("Table created successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
