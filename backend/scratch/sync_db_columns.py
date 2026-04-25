import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__) + "/../")

from app.database import engine
from sqlalchemy import text

async def run():
    print("Checking for other potentially missing columns...")
    async with engine.begin() as conn:
        checks = [
            ("agents", "website_pages_config", "JSONB DEFAULT '{}'::jsonb"),
            ("packages", "is_public", "BOOLEAN DEFAULT TRUE"),
            ("packages", "package_mode", "VARCHAR DEFAULT 'single'"),
            ("packages", "destinations", "TEXT DEFAULT '[]'"),
            ("packages", "activities", "TEXT DEFAULT '[]'"),
            ("packages", "is_template", "BOOLEAN DEFAULT FALSE"),
            ("packages", "template_destination", "VARCHAR(255)"),
            ("packages", "template_max_days", "INTEGER DEFAULT 15"),
            ("packages", "is_popular_destination", "BOOLEAN DEFAULT FALSE"),
            ("packages", "feature_image_url", "VARCHAR"),
            ("packages", "view_count", "INTEGER DEFAULT 0"),
        ]
        
        for table, column, col_type in checks:
            check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}';")
            result = await conn.execute(check_sql)
            if not result.scalar():
                print(f"Adding column {column} to {table} table...")
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"))
                print(f"Column {column} added successfully.")
            else:
                pass # Already exists
    print("Database sync complete.")

if __name__ == "__main__":
    asyncio.run(run())
