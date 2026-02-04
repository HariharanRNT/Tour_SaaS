import asyncio
from app.database import engine, Base, AsyncSessionLocal
from app.models import SubscriptionPlan
from sqlalchemy import select
from decimal import Decimal
import json

async def seed_plans():
    async with AsyncSessionLocal() as db:
        print("Checking existing plans...")
        result = await db.execute(select(SubscriptionPlan))
        plans = result.scalars().all()
        
        if plans:
            print(f"Plans already exist: {[p.name for p in plans]}. Skipping seed.")
            return

        print("Seeding default plans...")
        
        plans_data = [
            {
                "name": "Starter Plan",
                "price": Decimal("25000.00"),
                "billing_cycle": "monthly",
                "features": json.dumps(["Basic AI features", "Standard support", "Custom packages only"]),
                "booking_limit": 100,
                "user_limit": 1
            },
            {
                "name": "Professional Plan",
                "price": Decimal("50000.00"),
                "billing_cycle": "monthly",
                "features": json.dumps(["Full AI features", "Priority support", "Custom packages + 3 APIs", "Up to 20 users"]),
                "booking_limit": 500,
                "user_limit": 20
            },
            {
                "name": "Enterprise Plan",
                "price": Decimal("75000.00"),
                "billing_cycle": "monthly",
                "features": json.dumps(["Advanced AI & Analytics", "24/7 Dedicated Support", "Unlimited APIs", "White-label option"]),
                "booking_limit": -1, # Unlimited
                "user_limit": 999
            }
        ]

        for p_data in plans_data:
            plan = SubscriptionPlan(**p_data)
            db.add(plan)
        
        await db.commit()
        print("Default plans created successfully.")

if __name__ == "__main__":
    asyncio.run(seed_plans())
