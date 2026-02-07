-- Migration to fix bookings table schema mismatch

-- 1. Add model_id column if it doesn't exist
-- This column will store the houseboat model (e.g., 'nicols-duo')
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS model_id text REFERENCES houseboat_models(id);

-- 2. Handle houseboat_id transition
-- Current code expects houseboat_id to point to a specific boat UNIT (UUID).
-- Existing schema has it as TEXT and referencing models.

-- First, remove the old constraint if it exists (might need to check constraint name, 
-- but usually it's bookings_houseboat_id_fkey)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_houseboat_id_fkey') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_houseboat_id_fkey;
    END IF;
END $$;

-- Change column type to UUID to match boats.id if necessary
-- Note: This might fail if there's existing data that isn't a valid UUID.
-- If this is a fresh database or test data, it's fine.
ALTER TABLE bookings 
ALTER COLUMN houseboat_id TYPE uuid USING houseboat_id::uuid;

-- Add correct reference to individual boats
ALTER TABLE bookings
ADD CONSTRAINT bookings_houseboat_unit_id_fkey 
FOREIGN KEY (houseboat_id) REFERENCES boats(id);

-- 3. Add any other missing columns found in the route
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS number_of_guests integer,
ADD COLUMN IF NOT EXISTS daily_travel_package_id text, -- already in some versions but let's be sure
ADD COLUMN IF NOT EXISTS restaurant_table_id text;
