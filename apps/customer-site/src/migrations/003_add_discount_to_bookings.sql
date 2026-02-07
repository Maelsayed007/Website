-- Add discount column to bookings table
ALTER TABLE bookings ADD COLUMN discount NUMERIC DEFAULT 0;
