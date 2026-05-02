"""
Fix expires_at for active subscriptions by computing:
  expires_at = created_at + plan_duration_hours
This gives a precise expiry matching the purchase timestamp.
Run once: python scratch/fix_active_sub_expires_at.py
"""
import asyncio
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Subscription
from datetime import timedelta, timezone


def get_duration_hours(billing_cycle: str, duration_days: int | None) -> int:
    if billing_cycle == 'yearly':
        return 365 * 24
    elif billing_cycle == 'quarterly':
        return 90 * 24
    elif billing_cycle == 'monthly':
        return 30 * 24
    elif billing_cycle == 'daily':
        return 24
    elif billing_cycle == 'custom':
        return (duration_days or 30) * 24
    return 30 * 24


async def run():
    async with AsyncSessionLocal() as db:
        stmt = select(Subscription).options(selectinload(Subscription.plan))
        result = await db.execute(stmt)
        subs = result.scalars().all()

        updated = 0
        for sub in subs:
            if sub.created_at is None or sub.plan is None:
                continue
            hours = get_duration_hours(sub.plan.billing_cycle, sub.plan.duration_days)
            # created_at is the purchase timestamp
            created_utc = sub.created_at.astimezone(timezone.utc)
            new_expires_at = created_utc + timedelta(hours=hours)

            old = sub.expires_at
            sub.expires_at = new_expires_at
            print(f"  Sub {sub.id} ({sub.plan.name}, {sub.status}): {old} -> {new_expires_at}")
            updated += 1

        await db.commit()
        print(f"\nUpdated {updated} subscriptions with precise expires_at based on purchase time.")

if __name__ == "__main__":
    asyncio.run(run())
