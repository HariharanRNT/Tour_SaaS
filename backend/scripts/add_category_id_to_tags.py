import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def migrate():
    with engine.connect() as conn:
        print("Adding category_id to activity_tags table...")
        try:
            conn.execute(text("ALTER TABLE activity_tags ADD COLUMN category_id UUID REFERENCES activity_categories(id) ON DELETE SET NULL"))
            conn.commit()
            print("Successfully added category_id to activity_tags.")
        except Exception as e:
            print(f"Column might already exist or error occurred: {e}")

if __name__ == "__main__":
    migrate()
