
import asyncio
from sqlalchemy import text
from app.database import get_db, engine

async def migrate_payments():
    async with engine.begin() as conn:
        print("Altering payments table...")
        # Make booking_id nullable
        await conn.execute(text("ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL"))
        # Add subscription_id column if it doesn't exist
        try:
            await conn.execute(text("ALTER TABLE payments ADD COLUMN subscription_id UUID REFERENCES subscriptions(id)"))
        except Exception as e:
            print(f"Column subscription_id might already exist: {e}")
            
    print("Migration complete.")

if __name__ == "__main__":
    import sys
    import os
    # Add backend directory to python path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    asyncio.run(migrate_payments())
