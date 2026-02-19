import asyncio
import sys
sys.path.insert(0, 'd:\\Hariharan\\G-Project\\RNT_Tour\\backend')

async def test_endpoint():
    from app.database import get_db
    from app.models import SubscriptionPlan
    from sqlalchemy import select
    
    try:
        async for db in get_db():
            result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.is_active == True))
            plans = result.scalars().all()
            print(f"Found {len(plans)} plans")
            for plan in plans:
                print(f"- {plan.name}: ${plan.price}")
            break
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_endpoint())
