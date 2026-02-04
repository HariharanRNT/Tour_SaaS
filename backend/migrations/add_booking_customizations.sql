-- Migration: Add Booking Customizations Support
-- This enables users to customize package itineraries during booking

BEGIN;

-- Create booking_customizations table
CREATE TABLE IF NOT EXISTS booking_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    time_slot VARCHAR(20), -- morning, afternoon, evening, night
    
    -- Activity details
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    activity_price NUMERIC(10,2),
    
    -- Customization metadata
    is_removed BOOLEAN DEFAULT FALSE, -- User removed this default activity
    is_custom BOOLEAN DEFAULT FALSE,  -- User added this custom activity
    original_item_id UUID REFERENCES itinerary_items(id), -- Link to original if modified
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_customizations_booking 
ON booking_customizations(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_customizations_day 
ON booking_customizations(booking_id, day_number);

COMMIT;

-- Verification
SELECT 'Booking customizations table created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_name = 'booking_customizations';
