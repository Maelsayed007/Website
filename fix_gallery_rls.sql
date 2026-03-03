-- Enable RLS for site_gallery
ALTER TABLE site_gallery ENABLE ROW LEVEL SECURITY;

-- Allow public read access (required for the website gallery page)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_gallery' AND policyname = 'Public read site_gallery'
    ) THEN
        CREATE POLICY "Public read site_gallery" ON site_gallery FOR SELECT USING (true);
    END IF;
END $$;

-- Allow public create (matching the pattern used for bookings/clients in this project for the dashboard)
-- Note: In a production environment with full auth, this should be restricted to authenticated users.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_gallery' AND policyname = 'Public create site_gallery'
    ) THEN
        CREATE POLICY "Public create site_gallery" ON site_gallery FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Allow public update/delete for dashboard management
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_gallery' AND policyname = 'Public update site_gallery'
    ) THEN
        CREATE POLICY "Public update site_gallery" ON site_gallery FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_gallery' AND policyname = 'Public delete site_gallery'
    ) THEN
        CREATE POLICY "Public delete site_gallery" ON site_gallery FOR DELETE USING (true);
    END IF;
END $$;
