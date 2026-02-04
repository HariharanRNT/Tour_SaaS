-- Combined Migration Script: Template Support + Booking Customizations + Test Data
-- Run this with: psql -U postgres -d tour_saas -f migrations/complete_migration.sql

BEGIN;

-- ============================================================================
-- PART 1: Template Support Migration
-- ============================================================================

-- Add template fields to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS template_destination VARCHAR(255);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS template_max_days INTEGER DEFAULT 15;

-- Add time slot fields to itinerary_items table
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS time_slot VARCHAR(20);
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_packages_template ON packages(is_template, template_destination);
CREATE INDEX IF NOT EXISTS idx_itinerary_day_slot ON itinerary_items(package_id, day_number, time_slot);

-- Create user_itineraries table
CREATE TABLE IF NOT EXISTS user_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    num_days INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_itinerary_activities table
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

-- Create indexes for user itineraries
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user ON user_itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_itineraries_template ON user_itineraries(template_package_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_itinerary ON user_itinerary_activities(user_itinerary_id);

-- ============================================================================
-- PART 2: Booking Customizations Migration
-- ============================================================================

-- Create booking_customizations table
CREATE TABLE IF NOT EXISTS booking_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    time_slot VARCHAR(20),
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    activity_price NUMERIC(10,2),
    is_removed BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT FALSE,
    original_item_id UUID REFERENCES itinerary_items(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for booking customizations
CREATE INDEX IF NOT EXISTS idx_booking_customizations_booking ON booking_customizations(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_customizations_day ON booking_customizations(booking_id, day_number);

-- ============================================================================
-- PART 3: Test Data
-- ============================================================================

-- Insert test packages for different destinations
INSERT INTO packages (id, title, slug, description, destination, duration_days, duration_nights, category, price_per_person, max_group_size, status, created_at)
VALUES 
    (gen_random_uuid(), 'Tokyo Adventure 7 Days', 'tokyo-adventure-7-days', 'Experience the vibrant culture, modern technology, and ancient traditions of Tokyo. Visit iconic landmarks, enjoy authentic cuisine, and explore hidden gems.', 'Tokyo', 7, 6, 'Cultural', 1500.00, 15, 'PUBLISHED', NOW()),
    (gen_random_uuid(), 'Paris Romantic Getaway', 'paris-romantic-getaway', 'Discover the City of Light with this romantic 5-day tour. Visit the Eiffel Tower, Louvre Museum, and enjoy Seine river cruises.', 'Paris', 5, 4, 'Romantic', 1200.00, 12, 'PUBLISHED', NOW()),
    (gen_random_uuid(), 'Bali Beach Paradise', 'bali-beach-paradise', 'Relax on pristine beaches, explore ancient temples, and experience Balinese culture in this tropical paradise.', 'Bali', 6, 5, 'Beach', 900.00, 20, 'PUBLISHED', NOW()),
    (gen_random_uuid(), 'New York City Explorer', 'new-york-city-explorer', 'Explore the Big Apple with visits to Times Square, Central Park, Statue of Liberty, and world-class museums.', 'New York', 5, 4, 'Urban', 1800.00, 15, 'PUBLISHED', NOW()),
    (gen_random_uuid(), 'London Historical Tour', 'london-historical-tour', 'Discover London''s rich history with visits to Buckingham Palace, Tower of London, and Westminster Abbey.', 'London', 6, 5, 'Historical', 1400.00, 18, 'PUBLISHED', NOW()),
    (gen_random_uuid(), 'Dubai Luxury Experience', 'dubai-luxury-experience', 'Experience luxury in Dubai with desert safaris, Burj Khalifa visits, and world-class shopping.', 'Dubai', 5, 4, 'Luxury', 2000.00, 12, 'PUBLISHED', NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verification
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as packages_count FROM packages WHERE status = 'PUBLISHED';
SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_itineraries', 'user_itinerary_activities', 'booking_customizations');
