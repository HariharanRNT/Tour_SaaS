import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def fix_fks():
    with engine.connect() as conn:
        print("Updating Master Data Foreign Keys...")
        
        # Trip Styles
        conn.execute(text("ALTER TABLE trip_styles DROP CONSTRAINT IF EXISTS trip_styles_agent_id_fkey"))
        conn.execute(text("ALTER TABLE trip_styles ADD CONSTRAINT trip_styles_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE"))
        
        # Activity Tags
        conn.execute(text("ALTER TABLE activity_tags DROP CONSTRAINT IF EXISTS activity_tags_agent_id_fkey"))
        conn.execute(text("ALTER TABLE activity_tags ADD CONSTRAINT activity_tags_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE"))
        
        # Activity Categories
        conn.execute(text("ALTER TABLE activity_categories DROP CONSTRAINT IF EXISTS activity_categories_agent_id_fkey"))
        conn.execute(text("ALTER TABLE activity_categories ADD CONSTRAINT activity_categories_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE"))
        
        conn.commit()
        print("Foreign Keys updated successfully.")

if __name__ == "__main__":
    fix_fks()
