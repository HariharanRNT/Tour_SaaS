"""
Migration: Add new plan-trip theme columns to agent_themes table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

# Use sync engine for migration
sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def migrate():
    new_columns = [
        ("plan_trip_hero_overlay_opacity", "FLOAT DEFAULT 0.5"),
        ("plan_trip_cta_text", "VARCHAR"),
        ("plan_trip_cta_color", "VARCHAR"),
        ("plan_trip_info_section_heading", "VARCHAR"),
        ("plan_trip_info_cards", "JSON"),
    ]

    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE agent_themes ADD COLUMN {col_name} {col_type}"))
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"⏭️  Column already exists: {col_name}")
                else:
                    print(f"❌ Error adding {col_name}: {e}")
        conn.commit()
    print("\n✅ Migration complete.")

if __name__ == "__main__":
    migrate()
