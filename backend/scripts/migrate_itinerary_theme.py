"""
Migration: Add new itinerary theme columns to agent_themes table
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
        ("itin_hero_image", "VARCHAR"),
        ("itin_hero_overlay_opacity", "FLOAT DEFAULT 1.0"),
        ("itin_destination_accent_color", "VARCHAR"),
        ("itin_info_card_style", "VARCHAR DEFAULT 'transparent'"),
        ("itin_overview_icon_color", "VARCHAR"),
        ("itin_overview_card_style", "VARCHAR DEFAULT 'white'"),
        ("itin_overview_card_border", "VARCHAR DEFAULT 'subtle'"),
        ("itin_heading_border_color", "VARCHAR"),
        ("itin_active_day_color", "VARCHAR"),
        ("itin_morning_color", "VARCHAR"),
        ("itin_afternoon_color", "VARCHAR"),
        ("itin_evening_color", "VARCHAR"),
        ("itin_night_color", "VARCHAR"),
        ("itin_day_badge_color", "VARCHAR"),
        ("itin_activity_layout", "VARCHAR DEFAULT 'expanded'"),
        ("itin_sidebar_bg", "VARCHAR DEFAULT 'white'"),
        ("itin_price_color", "VARCHAR"),
        ("itin_cta_text", "VARCHAR"),
        ("itin_cta_color", "VARCHAR"),
        ("itin_cta_text_color", "VARCHAR"),
        ("itin_show_trust_badges", "BOOLEAN DEFAULT TRUE"),
        ("itin_ai_badge_color", "VARCHAR"),
        ("itin_tag_color", "VARCHAR"),
        ("itin_show_ai_badge", "BOOLEAN DEFAULT TRUE"),
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
