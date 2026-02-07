-- Migration to add boat_name to bookings for easier notifications
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS boat_name text;
