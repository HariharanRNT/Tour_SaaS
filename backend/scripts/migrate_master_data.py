import sys
import os
import json
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

# Use sync engine for migration
sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)

def migrate():
    with engine.connect() as conn:
        print("Starting Data Migration for Master Data...\n")
        
        # Ensure category_id column exists on activities table
        col_check = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='activities' AND column_name='category_id'"
        )).fetchone()
        
        if not col_check:
            print("Adding category_id column to activities table...")
            conn.execute(text("ALTER TABLE activities ADD COLUMN category_id UUID REFERENCES activity_categories(id) ON DELETE SET NULL"))
        
        # --- 1. FOR PACKAGES — Trip Styles ---
        packages = conn.execute(text("SELECT id, trip_style FROM packages WHERE trip_style IS NOT NULL AND trip_style != ''")).fetchall()
        migrated_trip_styles = 0
        new_trip_styles_created = 0
        
        for pkg in packages:
            pkg_id, ts_val = pkg
            try:
                ts_list = json.loads(ts_val) if ts_val.startswith('[') else [ts_val]
            except Exception:
                ts_list = [ts_val]
                
            for ts in ts_list:
                ts = str(ts).strip()
                if not ts:
                    continue
                
                row = conn.execute(text("SELECT id FROM trip_styles WHERE LOWER(name) = LOWER(:ts)"), {"ts": ts}).fetchone()
                
                if row:
                    ts_id = row[0]
                else:
                    new_id = str(uuid.uuid4())
                    conn.execute(text("INSERT INTO trip_styles (id, name, created_by, is_active) VALUES (:id, :ts, 'ADMIN', true)"), {"id": new_id, "ts": ts})
                    new_trip_styles_created += 1
                    ts_id = new_id
                    
                try:
                    conn.execute(text("INSERT INTO package_trip_styles (package_id, trip_style_id) VALUES (:pid, :tid)"), 
                                 {"pid": pkg_id, "tid": ts_id})
                    migrated_trip_styles += 1
                except Exception:
                    pass # Ignore duplicate inserts
        
        # --- 2. FOR PACKAGES — Activity Tags ---
        packages_act = conn.execute(text("SELECT id, activities FROM packages WHERE activities IS NOT NULL AND activities != '' AND activities != '[]'")).fetchall()
        migrated_activity_tags = 0
        new_activity_tags_created = 0
        
        for pkg in packages_act:
            pkg_id, act_val = pkg
            try:
                act_list = json.loads(act_val) if act_val.startswith('[') else [act_val]
            except Exception:
                act_list = [act_val]
                
            for act in act_list:
                act = str(act).strip()
                if not act:
                    continue
                    
                row = conn.execute(text("SELECT id FROM activity_tags WHERE LOWER(name) = LOWER(:name)"), {"name": act}).fetchone()
                
                if row:
                    act_id = row[0]
                else:
                    new_id = str(uuid.uuid4())
                    conn.execute(text("INSERT INTO activity_tags (id, name, created_by, is_active) VALUES (:id, :name, 'ADMIN', true)"), {"id": new_id, "name": act})
                    new_activity_tags_created += 1
                    act_id = new_id
                    
                try:
                    conn.execute(text("INSERT INTO package_activity_tags (package_id, activity_tag_id) VALUES (:pid, :tid)"), 
                                 {"pid": pkg_id, "tid": act_id})
                    migrated_activity_tags += 1
                except Exception:
                    pass

        # --- 3. FOR ACTIVITIES — Category field ---
        activities = conn.execute(text("SELECT id, category FROM activities WHERE category IS NOT NULL AND category != ''")).fetchall()
        migrated_categories = 0
        new_categories_created = 0
        
        for activity in activities:
            act_id, cat_val = activity
            cat_val = str(cat_val).strip()
            if not cat_val:
                continue
                
            row = conn.execute(text("SELECT id FROM activity_categories WHERE LOWER(name) = LOWER(:cat)"), {"cat": cat_val}).fetchone()
            
            if row:
                cat_id = row[0]
            else:
                new_id = str(uuid.uuid4())
                conn.execute(text("INSERT INTO activity_categories (id, name, created_by, is_active) VALUES (:id, :cat, 'ADMIN', true)"), {"id": new_id, "cat": cat_val})
                new_categories_created += 1
                cat_id = new_id
                
            conn.execute(text("UPDATE activities SET category_id = :cat_id WHERE id = :act_id"), {"cat_id": cat_id, "act_id": act_id})
            migrated_categories += 1

        conn.commit()
        
        print(f"Migrated {migrated_trip_styles} packages trip styles")
        print(f"Migrated {migrated_activity_tags} packages activity tags")
        print(f"Migrated {migrated_categories} activity categories")
        print(f"Created {new_trip_styles_created + new_activity_tags_created + new_categories_created} new global defaults from unmatched values")

if __name__ == "__main__":
    migrate()
