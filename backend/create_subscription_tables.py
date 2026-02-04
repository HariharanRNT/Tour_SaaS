import asyncio
from app.database import engine, Base
from app.models import SubscriptionPlan, Subscription, Invoice, Notification

async def create_tables():
    async with engine.begin() as conn:
        print("Creating subscription tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
