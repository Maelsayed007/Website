-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix bookings table ID to auto-generate
ALTER TABLE bookings 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Ensure selected_extras is not null (optional, but good practice per error logs)
ALTER TABLE bookings 
ALTER COLUMN selected_extras SET DEFAULT '[]'::jsonb;
