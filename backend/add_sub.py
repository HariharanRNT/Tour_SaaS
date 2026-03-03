import asyncio
import uuid
from datetime import date, timedelta
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import User, SubscriptionPlan

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with AsyncSession(engine) as session:
        # Get user
        user = (await session.execute(select(User).where(User.email == 'agent1@toursaas.com'))).scalar_one_or_none()
        
        # Get any plan
        plan = (await session.execute(select(SubscriptionPlan).limit(1))).scalar_one_or_none()
        
        if user and plan:
            # Create sub
            await session.execute(
                text("INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date) VALUES (:id, :uid, :pid, 'active', :sd, :ed)"),
                {
                    "id": uuid.uuid4(),
                    "uid": user.id,
                    "pid": plan.id,
                    "sd": date.today(),
                    "ed": date.today() + timedelta(days=30)
                }
            )
            await session.commit()
            print("Subscription created for agent1")
        else:
            print("User or plan not found")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
