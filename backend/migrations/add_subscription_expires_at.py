"""
Migration: Add expires_at (DateTime with timezone) to subscriptions table.
Run once: python migrations/add_subscription_expires_at.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as db:
        # 1. Add column (idempotent – skip if already exists)
        try:
            await db.execute(text(
                "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "
                "expires_at TIMESTAMPTZ"
            ))
            await db.commit()
            print("Column 'expires_at' added (or already existed).")
        except Exception as e:
            await db.rollback()
            print(f"Column add failed (may already exist): {e}")

        # 2. Backfill: set expires_at = end_date::timestamptz for rows where expires_at IS NULL
        try:
            result = await db.execute(text(
                "UPDATE subscriptions "
                "SET expires_at = (end_date::text || ' 23:59:59+05:30')::timestamptz "
                "WHERE expires_at IS NULL"
            ))
            await db.commit()
            print(f"Backfilled {result.rowcount} rows with expires_at from end_date.")
        except Exception as e:
            await db.rollback()
            print(f"Backfill failed: {e}")

if __name__ == "__main__":
    asyncio.run(run())
