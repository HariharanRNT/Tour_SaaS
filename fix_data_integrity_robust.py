
import asyncio
import os
import sys
from sqlalchemy import text
from decimal import Decimal

# Add the backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.database import engine

async def fix_data():
    async with engine.begin() as conn:
        try:
            print("--- Starting Robust Data Integrity Fix (Raw SQL) ---")
            
            # 1. Truncate long traveler names
            print("Truncating traveler names longer than 100 characters...")
            await conn.execute(text("""
                UPDATE travelers 
                SET first_name = LEFT(first_name, 100), 
                    last_name = LEFT(last_name, 100)
                WHERE LENGTH(first_name) > 100 OR LENGTH(last_name) > 100
            """))
            print("Traveler names truncated.")

            # 2. Fix User NULL fields
            print("\nFixing NULL fields in users table...")
            await conn.execute(text("""
                UPDATE users 
                SET approval_status = 'PENDING' 
                WHERE approval_status IS NULL
            """))
            await conn.execute(text("""
                UPDATE users 
                SET email_verified = false 
                WHERE email_verified IS NULL
            """))
            await conn.execute(text("""
                UPDATE users 
                SET is_active = true 
                WHERE is_active IS NULL
            """))
            print("User NULL fields fixed.")

            print("\n--- Data Integrity Fix Completed Successfully ---")
            
        except Exception as e:
            print(f"Error during data fix: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_data())
