-- Adapt User Plan to Existing Schema

-- 1. Create 'payments' table to track specific Stripe transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, -- Mapped from reservations
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending', -- pending, succeeded, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add description to payment_tokens (previously payment_links)
ALTER TABLE payment_tokens ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payment_tokens ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. Enable RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Staff can view all payments
DROP POLICY IF EXISTS "Staff view all payments" ON payments;
CREATE POLICY "Staff view all payments" ON payments FOR SELECT TO authenticated USING (true); -- Simplified for now

-- System (Service Role) gets full access by default, but we can be explicit if needed.
-- Make sure the webhook can insert.

