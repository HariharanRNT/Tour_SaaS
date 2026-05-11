import asyncio
import sys
import os

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

async def add_column():
    print("Attempting to add 'subscription_reference' column to 'subscriptions' table...")
    async with engine.begin() as conn:
        try:
            # Check if column exists first (PostgreSQL syntax)
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='subscriptions' AND column_name='subscription_reference';
            """))
            if result.fetchone():
                print("Column 'subscription_reference' already exists.")
            else:
                await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN subscription_reference VARCHAR;"))
                await conn.execute(text("CREATE UNIQUE INDEX ix_subscriptions_subscription_reference ON subscriptions (subscription_reference);"))
                print("Successfully added 'subscription_reference' column and index.")
        except Exception as e:
            print(f"Error adding column: {e}")
            # If it's SQLite (for local dev fallback)
            try:
                 await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN subscription_reference VARCHAR;"))
                 print("Successfully added 'subscription_reference' column (SQLite fallback).")
            except Exception as sqlite_e:
                 print(f"SQLite fallback also failed: {sqlite_e}")

if __name__ == "__main__":
    asyncio.run(add_column())
