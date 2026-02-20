import sys
import os
from sqlalchemy import create_engine, text

# Hardcoded URL for migration
DATABASE_URL = "postgresql://postgres:1243@localhost:5432/tour_saas"

# Use sync engine for migration
sync_url = DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def migrate():
    new_columns = [
        ("navbar_logo_text", "VARCHAR"),
        ("navbar_logo_image", "VARCHAR"),
        ("navbar_logo_color", "VARCHAR"),
        ("navbar_links", "JSON"),
        ("navbar_links_color", "VARCHAR"),
        ("navbar_login_label", "VARCHAR"),
        ("navbar_login_show", "BOOLEAN DEFAULT TRUE"),
        ("navbar_login_style", "VARCHAR DEFAULT 'text'"),
        ("navbar_signup_label", "VARCHAR"),
        ("navbar_signup_bg_color", "VARCHAR"),
        ("navbar_signup_text_color", "VARCHAR"),
        ("navbar_bg_color", "VARCHAR"),
        ("navbar_border_color", "VARCHAR"),
        ("navbar_sticky", "BOOLEAN DEFAULT TRUE"),
        ("navbar_transparent_on_hero", "BOOLEAN DEFAULT FALSE"),
        ("navbar_style_preset", "VARCHAR DEFAULT 'light'"),
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
