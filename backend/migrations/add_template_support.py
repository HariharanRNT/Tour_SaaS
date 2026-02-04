"""Add template support for default package templates

This migration adds:
1. Template fields to packages table
2. Time slot fields to itinerary_items table
3. New user_itineraries table
4. New user_itinerary_activities table

This enables admin-configured default itineraries that auto-populate user trips.
"""

from sqlalchemy import text
from app.database import engine


def upgrade():
    """Apply migration"""
    with engine.connect() as conn:
        # 1. Add template fields to packages table
        conn.execute(text("""
            ALTER TABLE packages
            ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS template_destination VARCHAR(255),
            ADD COLUMN IF NOT EXISTS template_max_days INTEGER DEFAULT 15;
        """))
        
        # 2. Add time slot fields to itinerary_items table
        conn.execute(text("""
            ALTER TABLE itinerary_items
            ADD COLUMN IF NOT EXISTS time_slot VARCHAR(20),
            ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
        """))
        
        # 3. Create user_itineraries table
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
        
        # 4. Create user_itinerary_activities table
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
        
        # 5. Create indexes for performance
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
        print("✅ Migration completed successfully!")


def downgrade():
    """Rollback migration"""
    with engine.connect() as conn:
        # Drop indexes
        conn.execute(text("DROP INDEX IF EXISTS idx_user_activities_itinerary;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_user_itineraries_template;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_user_itineraries_user;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_itinerary_day_slot;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_packages_template;"))
        
        # Drop tables
        conn.execute(text("DROP TABLE IF EXISTS user_itinerary_activities;"))
        conn.execute(text("DROP TABLE IF EXISTS user_itineraries;"))
        
        # Remove columns from itinerary_items
        conn.execute(text("""
            ALTER TABLE itinerary_items
            DROP COLUMN IF EXISTS display_order,
            DROP COLUMN IF EXISTS is_optional,
            DROP COLUMN IF EXISTS time_slot;
        """))
        
        # Remove columns from packages
        conn.execute(text("""
            ALTER TABLE packages
            DROP COLUMN IF EXISTS template_max_days,
            DROP COLUMN IF EXISTS template_destination,
            DROP COLUMN IF EXISTS is_template;
        """))
        
        conn.commit()
        print("✅ Rollback completed successfully!")


if __name__ == "__main__":
    print("Running migration: Add template support")
    upgrade()
