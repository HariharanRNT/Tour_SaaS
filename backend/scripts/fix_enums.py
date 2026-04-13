
import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to path to import app modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def fix_enums():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Checking and updating enums...")
        
        # Add PAID to paymentstatus
        try:
            await conn.execute(text("ALTER TYPE paymentstatus ADD VALUE 'PAID' AFTER 'SUCCEEDED'"))
            print("Successfully added 'PAID' to paymentstatus enum.")
        except Exception as e:
            if "already exists" in str(e):
                print("'PAID' already exists in paymentstatus enum.")
            else:
                print(f"Error adding 'PAID' to paymentstatus: {e}")

        # Add INITIATED to bookingstatus
        try:
            # We might need to handle where it goes. Usually first is fine.
            await conn.execute(text("ALTER TYPE bookingstatus ADD VALUE 'INITIATED' BEFORE 'PENDING'"))
            print("Successfully added 'INITIATED' to bookingstatus enum.")
        except Exception as e:
            if "already exists" in str(e):
                print("'INITIATED' already exists in bookingstatus enum.")
            else:
                print(f"Error adding 'INITIATED' to bookingstatus: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_enums())
