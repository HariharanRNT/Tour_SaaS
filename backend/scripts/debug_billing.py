import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import SubscriptionPlan, Subscription

async def check_subscriptions():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import text
        print("Checking tables directly...")
        tables = ['subscription_plans', 'subscriptions', 'invoices', 'payments']
        for table in tables:
            try:
                result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"Table {table}: {count} rows")
            except Exception as e:
                print(f"Error checking table {table}: {e}")

        print("\nChecking SubscriptionPlan columns...")
        try:
            result = await db.execute(text("SELECT * FROM subscription_plans LIMIT 1"))
            print(f"SubscriptionPlan columns: {result.keys()}")
        except Exception as e:
            print(f"Error checking SubscriptionPlan columns: {e}")

if __name__ == "__main__":
    asyncio.run(check_subscriptions())

if __name__ == "__main__":
    asyncio.run(check_subscriptions())
