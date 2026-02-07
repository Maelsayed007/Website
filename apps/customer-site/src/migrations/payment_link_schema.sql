-- payment_link_schema.sql
-- Adds support for secure payment links and invoicing details

-- 1. Add Billing Columns to Bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_nif TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- 2. Create Payment Tokens Table
CREATE TABLE IF NOT EXISTS payment_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    requested_amount NUMERIC(10, 2) -- Optional override for specific payment requests
);

-- 3. Enable RLS
ALTER TABLE payment_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Public needs to read token to validate it (via API mostly, but good to have policy)
DROP POLICY IF EXISTS "Public read access to valid tokens" ON payment_tokens;
CREATE POLICY "Public read access to valid tokens" ON payment_tokens FOR SELECT USING (expires_at > NOW() AND used_at IS NULL);

-- Admin can manage tokens
DROP POLICY IF EXISTS "Admin manage tokens" ON payment_tokens;
CREATE POLICY "Admin manage tokens" ON payment_tokens FOR ALL USING (auth.role() = 'authenticated');
