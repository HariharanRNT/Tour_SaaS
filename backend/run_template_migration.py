"""
Standalone migration script to add template support
Run this from the backend directory: python run_template_migration.py
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.config import settings

def run_migration():
    """Execute the template support migration"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("Starting migration: Add template support...")
    
    with engine.connect() as conn:
        try:
            # 1. Add template fields to packages table
            print("  Adding template fields to packages table...")
            conn.execute(text("""
                ALTER TABLE packages
                ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS template_destination VARCHAR(255),
                ADD COLUMN IF NOT EXISTS template_max_days INTEGER DEFAULT 15;
            """))
            conn.commit()
            
            # 2. Add time slot fields to itinerary_items table
            print("  Adding time slot fields to itinerary_items table...")
            conn.execute(text("""
                ALTER TABLE itinerary_items
                ADD COLUMN IF NOT EXISTS time_slot VARCHAR(20),
                ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
            """))
            conn.commit()
            
            # 3. Create user_itineraries table
            print("  Creating user_itineraries table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_itineraries (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id),
                    template_package_id UUID REFERENCES packages(id),
                    destination VARCHAR(255) NOT NULL,
                    start_date DATE,
                    end_date DATE,
                    num_days INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'draft',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ
                );
            """))
            conn.commit()
            
            # 4. Create user_itinerary_activities table
            print("  Creating user_itinerary_activities table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_itinerary_activities (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_itinerary_id UUID NOT NULL REFERENCES user_itineraries(id) ON DELETE CASCADE,
                    day_number INTEGER NOT NULL,
                    time_slot VARCHAR(20) NOT NULL,
                    activity_id VARCHAR(255),
                    activity_title VARCHAR(255) NOT NULL,
                    activity_description TEXT,
                    activity_price NUMERIC(10,2),
                    activity_duration VARCHAR(50),
                    activity_images TEXT[],
                    is_from_template BOOLEAN DEFAULT TRUE,
                    display_order INTEGER DEFAULT 0,
                    user_notes TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.commit()
            
            # 5. Create indexes for performance
            print("  Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_packages_template 
                ON packages(is_template, template_destination) 
                WHERE is_template = TRUE;
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_itinerary_day_slot 
                ON itinerary_items(package_id, day_number, time_slot);
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_itineraries_user 
                ON user_itineraries(user_id);
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_itineraries_template 
                ON user_itineraries(template_package_id);
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_activities_itinerary 
                ON user_itinerary_activities(user_itinerary_id, day_number);
            """))
            conn.commit()
            
            print("Migration completed successfully!")
            print("\nSummary:")
            print("  - Added 3 fields to 'packages' table")
            print("  - Added 3 fields to 'itinerary_items' table")
            print("  - Created 'user_itineraries' table")
            print("  - Created 'user_itinerary_activities' table")
            print("  - Created 5 indexes for performance")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    run_migration()
