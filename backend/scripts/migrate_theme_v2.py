import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def migrate_theme_v2():
    async with engine.begin() as conn:
        print("Checking for new theme customization columns...")
        
        # Check if columns exist first (PostgreSQL specific check for better robustness)
        # Using a safer approach: try adding columns one by one and catch errors if they already exist
        
        columns_to_add = [
            ("wcu_title", "VARCHAR"),
            ("wcu_accent_title", "VARCHAR"),
            ("hero_overlay_opacity", "FLOAT DEFAULT 0.6"),
            ("show_feature_cards", "BOOLEAN DEFAULT TRUE"),
            ("show_wcu_section", "BOOLEAN DEFAULT TRUE")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE agent_themes ADD COLUMN {col_name} {col_type};"))
                print(f"Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"Column {col_name} already exists, skipping.")
                else:
                    print(f"Error adding {col_name}: {e}")
        
        print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(migrate_theme_v2())
