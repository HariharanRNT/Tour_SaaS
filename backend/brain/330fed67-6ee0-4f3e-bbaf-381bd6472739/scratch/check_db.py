
import asyncio
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import Subscription, User, Agent, SubscriptionPlan, Payment, Booking

async def check_data():
    async with AsyncSessionLocal() as db:
        # Check Subscriptions
        stmt = select(Subscription)
        result = await db.execute(stmt)
        subs = result.scalars().all()
        print(f"Total Subscriptions in DB: {len(subs)}")
        for s in subs:
            print(f"Sub ID: {s.id}, User ID: {s.user_id}, Plan ID: {s.plan_id}, Status: {s.status}, Created At: {s.created_at}")

        # Check Payments
        stmt = select(Payment)
        result = await db.execute(stmt)
        payments = result.scalars().all()
        print(f"Total Payments in DB: {len(payments)}")
        for p in payments:
            print(f"Payment ID: {p.id}, Amount: {p.amount}, Status: {p.status}, Sub ID: {p.subscription_id}, Booking ID: {p.booking_id}")

        # Check Bookings
        stmt = select(Booking)
        result = await db.execute(stmt)
        bookings = result.scalars().all()
        print(f"Total Bookings in DB: {len(bookings)}")
        for b in bookings:
            print(f"Booking ID: {b.id}, Agent ID: {b.agent_id}, Status: {b.status}")

        # Check Users/Agents
        stmt = select(User).where(User.role == 'AGENT')
        result = await db.execute(stmt)
        agents = result.scalars().all()
        print(f"Total Agents in DB: {len(agents)}")

        # Check Plans
        stmt = select(SubscriptionPlan)
        result = await db.execute(stmt)
        plans = result.scalars().all()
        print(f"Total Plans in DB: {len(plans)}")

if __name__ == "__main__":
    asyncio.run(check_data())
