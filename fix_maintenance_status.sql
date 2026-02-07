-- Migration to fix bookings_status_check constraint (Data Cleanup Edition)

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Find and drop ANY check constraint on the 'status' column of the 'bookings' table
    FOR r IN (
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'bookings'::regclass
        AND c.contype = 'c'
        AND a.attname = 'status'
    ) LOOP
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;

    -- 2. DATA NORMALIZATION (Fix existing violations)
    -- This handles common typos and case issues (e.g., 'maintenance' -> 'Maintenance')
    UPDATE bookings SET status = 'Maintenance' WHERE status ILIKE 'maint%';
    UPDATE bookings SET status = 'Confirmed' WHERE status ILIKE 'conf%';
    UPDATE bookings SET status = 'Pending' WHERE status ILIKE 'pend%';
    UPDATE bookings SET status = 'Cancelled' WHERE status ILIKE 'canc%';
    
    -- Default any other unknown strings to 'Pending' to ensure the constraint passes
    UPDATE bookings 
    SET status = 'Pending' 
    WHERE status NOT IN ('Confirmed', 'Pending', 'Maintenance', 'Cancelled') 
    OR status IS NULL;

    -- 3. Add the clean, correct constraint
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('Confirmed', 'Pending', 'Maintenance', 'Cancelled'));
    
    RAISE NOTICE 'Normalized data and added new bookings_status_check constraint.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error applying migration: %', SQLERRM;
END $$;
