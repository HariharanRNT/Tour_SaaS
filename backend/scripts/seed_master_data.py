import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def seed():
    with engine.connect() as conn:
        print("Seeding Global Master Data...")
        
        # Trip Styles
        trip_styles = [
            ('Adventure', '🎒'), ('Leisure', '🏖️'), ('Cultural', '🏛️'), 
            ('Family', '👨‍👩‍👧'), ('Honeymoon', '💑'), ('Luxury', '⭐'), 
            ('Wellness', '🧘'), ('Group Tour', '🤝'), ('Corporate', '💼')
        ]
        for name, icon in trip_styles:
            conn.execute(text("""
                INSERT INTO trip_styles (id, name, icon, created_by, is_active) 
                VALUES (:id, :name, :icon, 'ADMIN', true) 
                ON CONFLICT (name, agent_id) DO NOTHING
            """), {"id": str(uuid.uuid4()), "name": name, "icon": icon})

        # Activity Tags
        activity_tags = [
            ('Beach', '🏖️'), ('Mountain', '⛰️'), ('Trekking', '🥾'), 
            ('Heritage', '🏛️'), ('Nature', '🌿'), ('Food & Culinary', '🍽️'), 
            ('City Tour', '🏙️'), ('Snow', '❄️'), ('Pilgrimage', '🛕'), 
            ('Water Sports', '🌊'), ('Safari', '🦁'), ('Cycling', '🚴'), 
            ('Wine Tour', '🍷'), ('Photography', '📸'), ('Festivals', '🎭')
        ]
        for name, icon in activity_tags:
            conn.execute(text("""
                INSERT INTO activity_tags (id, name, icon, created_by, is_active) 
                VALUES (:id, :name, :icon, 'ADMIN', true) 
                ON CONFLICT (name, agent_id) DO NOTHING
            """), {"id": str(uuid.uuid4()), "name": name, "icon": icon})

        # Activity Categories
        activity_categories = [
            'Sightseeing', 'Adventure', 'Cultural', 
            'Food & Drink', 'Beach & Water', 
            'Nature & Wildlife', 'Relaxation'
        ]
        for name in activity_categories:
            conn.execute(text("""
                INSERT INTO activity_categories (id, name, created_by, is_active) 
                VALUES (:id, :name, 'ADMIN', true) 
                ON CONFLICT (name, agent_id) DO NOTHING
            """), {"id": str(uuid.uuid4()), "name": name})

        conn.commit()
        print("Seeding successful.")

if __name__ == "__main__":
    seed()
