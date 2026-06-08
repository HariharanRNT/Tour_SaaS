
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def main():
    # Create a local engine without echo to avoid verbose logs
    local_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with local_engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT count(*) FROM users"))
            count = res.scalar()
            print(f"User count: {count}")
            
            res = await conn.execute(text("SELECT id, email, role FROM users"))
            users = res.all()
            print("Users in DB:")
            for u in users:
                print(f"ID: {u[0]}, Email: {u[1]}, Role: {u[2]}")
        except Exception as e:
            print(f"Error: {e}")
    await local_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
