-- Allow anyone to read payments (needed for dashboard and clients)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Payments" ON payments;
CREATE POLICY "Public Read Payments" ON payments FOR SELECT TO public USING (true);
