
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
    print("Beginning migration for Agent Self-Registration fields...")
    try:
        async with engine.begin() as conn:
            # Add columns to users table
            columns = [
                ("agency_name", "VARCHAR"),
                ("company_legal_name", "VARCHAR"),
                ("domain", "VARCHAR"),
                ("business_address", "VARCHAR"),
                ("country", "VARCHAR"),
                ("state", "VARCHAR"),
                ("city", "VARCHAR"),
                ("gst_no", "VARCHAR"),
                ("tax_id", "VARCHAR"),
                ("currency", "VARCHAR DEFAULT 'INR'"),
                ("commission_type", "VARCHAR DEFAULT 'percentage'"),
                ("commission_value", "FLOAT DEFAULT 0.0"),
                ("approval_status", "VARCHAR DEFAULT 'approved'")
            ]

            for col_name, col_type in columns:
                print(f"Adding '{col_name}' column...")
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    print(f"✅ '{col_name}' column added.")
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print(f"ℹ️ '{col_name}' column already exists.")
                    else:
                        print(f"❌ Error adding '{col_name}': {e}")
            
            # Ensure index on approval_status
            try:
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_approval_status ON users (approval_status)"))
                print("✅ Index on 'approval_status' created.")
            except Exception as e:
                print(f"ℹ️ Index creation note: {e}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
