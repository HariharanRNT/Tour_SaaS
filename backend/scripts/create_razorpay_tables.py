import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.database import Base
from app.config import settings
import app.models # to ensure they are registered

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    
    # 1. Add missing column to subscriptions
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN grace_period_ends_at TIMESTAMP WITH TIME ZONE;"))
        print("Added grace_period_ends_at column")
    except Exception as e:
        print(f"grace_period_ends_at might already exist: {e}")

    # 2. Create missing tables (WebhookEvent, Settlement)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Missing tables created successfully")
    except Exception as e:
        print(f"Failed to create new tables: {e}")

if __name__ == "__main__":
    asyncio.run(main())
