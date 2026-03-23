import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine

async def fix_subscription_data():
    async with engine.begin() as conn:
        print("Starting data repair for subscriptions table...")
        
        # 1. Fix NULL current_bookings_usage
        result = await conn.execute(text(
            "UPDATE subscriptions SET current_bookings_usage = 0 WHERE current_bookings_usage IS NULL"
        ))
        print(f"Updated {result.rowcount} rows with NULL current_bookings_usage")
        
        # 2. Fix NULL created_at (if any)
        from datetime import datetime
        now = datetime.now()
        result = await conn.execute(text(
            "UPDATE subscriptions SET created_at = :now WHERE created_at IS NULL"
        ), {"now": now})
        print(f"Updated {result.rowcount} rows with NULL created_at")
        
        # 3. Fix NULL status
        result = await conn.execute(text(
            "UPDATE subscriptions SET status = 'active' WHERE status IS NULL"
        ))
        print(f"Updated {result.rowcount} rows with NULL status")

        # 4. Fix NULL auto_renew
        result = await conn.execute(text(
            "UPDATE subscriptions SET auto_renew = true WHERE auto_renew IS NULL"
        ))
        print(f"Updated {result.rowcount} rows with NULL auto_renew")

        print("Data repair complete.")

if __name__ == "__main__":
    asyncio.run(fix_subscription_data())
