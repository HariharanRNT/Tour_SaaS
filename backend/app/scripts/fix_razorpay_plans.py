import asyncio
from app.database import AsyncSessionLocal
from app.models import SubscriptionPlan
from sqlalchemy import select

async def fix_plans():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SubscriptionPlan))
        plans = res.scalars().all()
        for p in plans:
            print(f"Clearing Razorpay ID for plan: {p.name} (Current Price: {p.price})")
            p.razorpay_plan_id = None
            db.add(p)
        await db.commit()
        print("Done. All plans will be recreated on Razorpay during the next purchase.")

if __name__ == "__main__":
    asyncio.run(fix_plans())
