-- =====================================================
-- STRIPE PAYMENTS SUPPORT
-- =====================================================

-- Add payment fields to bookings table
alter table bookings 
add column if not exists stripe_session_id text,
add column if not exists stripe_payment_intent_id text,
add column if not exists payment_status text default 'unpaid', -- 'unpaid', 'deposit_paid', 'fully_paid', 'failed'
add column if not exists amount_paid numeric default 0,
add column if not exists total_price numeric,
add column if not exists deposit_amount numeric;

-- Create index for faster lookups by stripe session
create index if not exists idx_bookings_stripe_session on bookings(stripe_session_id);

-- Payment Transactions Log
create table if not exists payment_transactions (
  id uuid default uuid_generate_v4() primary key,
  booking_id text references bookings(id) on delete set null,
  stripe_payment_id text not null,
  amount numeric not null,
  currency text default 'eur',
  status text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

alter table payment_transactions enable row level security;

-- Only staff/admin view transactions
drop policy if exists "Staff can view payment transactions" on payment_transactions;
create policy "Staff can view payment transactions" on payment_transactions
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        (profiles.permissions->>'canViewDashboard')::boolean = true
        or (profiles.permissions->>'isSuperAdmin')::boolean = true
      )
    )
  );

-- System inserts transactions
drop policy if exists "System can insert payment transactions" on payment_transactions;
create policy "System can insert payment transactions" on payment_transactions
  for insert with check (true);
