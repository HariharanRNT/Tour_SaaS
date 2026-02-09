import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, UserOTP

async def reproduce():
    async with AsyncSessionLocal() as db:
        # Check if we can run the query with datetime.utcnow()
        try:
            now = datetime.utcnow()
            stmt = select(UserOTP).where(UserOTP.expires_at > now)
            print(f"Executing query with naive datetime: {now}")
            result = await db.execute(stmt)
            print("Query executed successfully with naive datetime.")
        except Exception as e:
            print(f"Error with naive datetime: {type(e).__name__}: {e}")

        try:
            now_aware = datetime.now(timezone.utc)
            stmt = select(UserOTP).where(UserOTP.expires_at > now_aware)
            print(f"\nExecuting query with aware datetime: {now_aware}")
            result = await db.execute(stmt)
            print("Query executed successfully with aware datetime.")
        except Exception as e:
            print(f"Error with aware datetime: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(reproduce())
