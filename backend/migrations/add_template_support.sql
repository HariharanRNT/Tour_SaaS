-- Migration: Add Template Support for Default Package Templates
-- Run this with: psql -U postgres -d tour_saas -f add_template_support.sql

BEGIN;

-- 1. Add template fields to packages table
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_destination VARCHAR(255),
ADD COLUMN IF NOT EXISTS template_max_days INTEGER DEFAULT 15;

-- 2. Add time slot fields to itinerary_items table
ALTER TABLE itinerary_items
ADD COLUMN IF NOT EXISTS time_slot VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. Create user_itineraries table
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

-- 4. Create user_itinerary_activities table
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

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_packages_template 
ON packages(is_template, template_destination) 
WHERE is_template = TRUE;

CREATE INDEX IF NOT EXISTS idx_itinerary_day_slot 
ON itinerary_items(package_id, day_number, time_slot);

CREATE INDEX IF NOT EXISTS idx_user_itineraries_user 
ON user_itineraries(user_id);

CREATE INDEX IF NOT EXISTS idx_user_itineraries_template 
ON user_itineraries(template_package_id);

CREATE INDEX IF NOT EXISTS idx_user_activities_itinerary 
ON user_itinerary_activities(user_itinerary_id, day_number);

COMMIT;

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT 'Packages table columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'packages' AND column_name IN ('is_template', 'template_destination', 'template_max_days');

SELECT 'User itineraries table created:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_itineraries';
