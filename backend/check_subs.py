import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import User, Subscription

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with AsyncSession(engine) as session:
        user_stmt = select(User).where(User.email == 'agent1@toursaas.com')
        user_res = await session.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if user:
            print(f"User ID: {user.id}")
            sub_stmt = select(Subscription).where(Subscription.user_id == user.id)
            sub_res = await session.execute(sub_stmt)
            subs = sub_res.scalars().all()
            print(f"Number of subscriptions: {len(subs)}")
            for s in subs:
                print(f"Sub ID: {s.id}, status: {s.status}, end_date: {s.end_date}")
        else:
            print("User not found")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
