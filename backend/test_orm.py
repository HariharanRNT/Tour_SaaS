import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import User

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with AsyncSession(engine) as session:
        stmt = select(User).where(User.email == 'agent1@toursaas.com').options(selectinload(User.subscription))
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            print(f"User: {user.email}")
            print(f"Subscription loaded: {user.subscription is not None}")
            if user.subscription:
                print(f"Sub status: {user.subscription.status}, End date: {user.subscription.end_date}")
        else:
            print("User not found.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
