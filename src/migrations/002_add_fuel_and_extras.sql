-- Add fuel rate to houseboat models
ALTER TABLE houseboat_models 
ADD COLUMN IF NOT EXISTS fuel_rate_per_hour numeric DEFAULT 0;

-- Add selected extras to bookings (stores JSON array of selected options)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS selected_extras jsonb DEFAULT '[]'::jsonb;

-- Create Extras table if it doesn't exist
CREATE TABLE IF NOT EXISTS extras (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  price_type text CHECK (price_type IN ('per_stay', 'per_day', 'per_person')),
  type text CHECK (type IN ('all', 'houseboat', 'daily_travel', 'restaurant')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'extras' AND policyname = 'Public read extras'
    ) THEN
        CREATE POLICY "Public read extras" ON extras FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'extras' AND policyname = 'Admin write extras'
    ) THEN
        CREATE POLICY "Admin write extras" ON extras FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Insert default extras if empty
INSERT INTO extras (name, description, price, price_type, type)
SELECT 'Pet Fee', 'Bring your furry friend along', 50, 'per_stay', 'houseboat'
WHERE NOT EXISTS (SELECT 1 FROM extras WHERE name = 'Pet Fee');

INSERT INTO extras (name, description, price, price_type, type)
SELECT 'Stand Up Paddle', 'Inflatable SUP board', 30, 'per_day', 'houseboat'
WHERE NOT EXISTS (SELECT 1 FROM extras WHERE name = 'Stand Up Paddle');
