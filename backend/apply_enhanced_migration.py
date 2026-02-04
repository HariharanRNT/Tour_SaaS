
import asyncio
import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from app.database import engine

async def run_migration():
    print("Beginning migration for Enhanced Package Features...")
    try:
        async with engine.begin() as conn:
            # Add country column
            print("Adding 'country' column...")
            try:
                await conn.execute(text("ALTER TABLE packages ADD COLUMN country VARCHAR"))
                await conn.execute(text("CREATE INDEX ix_packages_country ON packages (country)"))
                print(" 'country' column added.")
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print(" 'country' column already exists.")
                else:
                    print(f" Error adding 'country': {e}")

            # Add is_public column
            print("Adding 'is_public' column...")
            try:
                await conn.execute(text("ALTER TABLE packages ADD COLUMN is_public BOOLEAN DEFAULT TRUE"))
                await conn.execute(text("CREATE INDEX ix_packages_is_public ON packages (is_public)"))
                print("✅ 'is_public' column added.")
            except Exception as e:
                if "duplicate column" in str(e).lower():
                     print(" 'is_public' column already exists.")
                else:
                    print(f" Error adding 'is_public': {e}")
                    
    except Exception as e:
        print(f" Migration failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
