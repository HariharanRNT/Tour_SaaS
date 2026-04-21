
import asyncio
import sys
import os
from sqlalchemy import text

# Add current directory to path to allow imports from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

async def fix_columns():
    print("Starting migration to add inclusions/exclusions to packages table...")
    
    async with engine.begin() as conn:
        # Check if inclusions column exists
        res = await conn.execute(text(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'inclusions'"
        ))
        if not res.fetchone():
            print("Adding 'inclusions' column...")
            await conn.execute(text(
                "ALTER TABLE packages ADD COLUMN inclusions JSONB DEFAULT '{}'"
            ))
        else:
            print("'inclusions' column already exists.")

        # Check if exclusions column exists
        res = await conn.execute(text(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'exclusions'"
        ))
        if not res.fetchone():
            print("Adding 'exclusions' column...")
            await conn.execute(text(
                "ALTER TABLE packages ADD COLUMN exclusions JSONB DEFAULT '{}'"
            ))
        else:
            print("'exclusions' column already exists.")

    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(fix_columns())
