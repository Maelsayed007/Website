-- =====================================================
-- SECURITY ENHANCEMENTS FOR AMIEIRA GETAWAYS
-- =====================================================
-- Run this script in Supabase SQL Editor
-- This script is idempotent - safe to run multiple times
-- =====================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =====================================================
-- SECURITY LOGS TABLE (Audit Trail)
-- =====================================================

create table if not exists security_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,          -- 'login_success', 'login_failed', 'permission_denied', etc.
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Index for faster queries
create index if not exists idx_security_logs_created_at on security_logs(created_at desc);
create index if not exists idx_security_logs_user_id on security_logs(user_id);
create index if not exists idx_security_logs_action on security_logs(action);

alter table security_logs enable row level security;

-- Only admins can read security logs
drop policy if exists "Admins can view security logs" on security_logs;
create policy "Admins can view security logs" on security_logs
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- Anyone can insert (the server will insert on behalf of users)
drop policy if exists "System can insert security logs" on security_logs;
create policy "System can insert security logs" on security_logs
  for insert with check (true);

-- =====================================================
-- AUTH ATTEMPTS TABLE (Rate Limiting)
-- =====================================================

create table if not exists auth_attempts (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  ip_address text,
  success boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for rate limiting queries
create index if not exists idx_auth_attempts_created on auth_attempts(created_at);
create index if not exists idx_auth_attempts_email on auth_attempts(email);

alter table auth_attempts enable row level security;

-- Service role can manage auth attempts
drop policy if exists "Service role can manage auth attempts" on auth_attempts;
create policy "Service role can manage auth attempts" on auth_attempts
  for all using (true);

-- =====================================================
-- CLEANUP FUNCTION (Run periodically)
-- =====================================================

-- Function to cleanup old auth attempts (keeps last 24 hours)
create or replace function cleanup_old_auth_attempts()
returns void as $$
begin
  delete from auth_attempts
  where created_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;

-- =====================================================
-- STRENGTHEN RLS POLICIES
-- Replace "authenticated" checks with permission-based checks
-- =====================================================

-- BOOKINGS: Staff with edit permission can modify, others can only view
drop policy if exists "Authenticated users can update bookings" on bookings;
drop policy if exists "Staff can update bookings" on bookings;
create policy "Staff can update bookings" on bookings 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        (profiles.permissions->>'canEditHouseboatReservations')::boolean = true
        or (profiles.permissions->>'isSuperAdmin')::boolean = true
      )
    )
  );

drop policy if exists "Authenticated users can insert bookings" on bookings;
drop policy if exists "Staff can insert bookings" on bookings;
create policy "Staff can insert bookings" on bookings 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        (profiles.permissions->>'canEditHouseboatReservations')::boolean = true
        or (profiles.permissions->>'isSuperAdmin')::boolean = true
      )
    )
  );

drop policy if exists "Staff can delete bookings" on bookings;
create policy "Staff can delete bookings" on bookings 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- HOUSEBOAT MODELS: Only super admins can modify
drop policy if exists "Authenticated users can insert models" on houseboat_models;
drop policy if exists "Authenticated users can update models" on houseboat_models;
drop policy if exists "Authenticated users can delete models" on houseboat_models;
drop policy if exists "Super admins can insert models" on houseboat_models;
drop policy if exists "Super admins can update models" on houseboat_models;
drop policy if exists "Super admins can delete models" on houseboat_models;

create policy "Super admins can insert models" on houseboat_models 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can update models" on houseboat_models 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can delete models" on houseboat_models 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- BOATS: Only super admins can modify
drop policy if exists "Authenticated users can insert boats" on boats;
drop policy if exists "Authenticated users can update boats" on boats;
drop policy if exists "Authenticated users can delete boats" on boats;
drop policy if exists "Super admins can insert boats" on boats;
drop policy if exists "Super admins can update boats" on boats;
drop policy if exists "Super admins can delete boats" on boats;

create policy "Super admins can insert boats" on boats 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can update boats" on boats 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can delete boats" on boats 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- TARIFFS: Only super admins can modify
drop policy if exists "Authenticated users can insert tariffs" on tariffs;
drop policy if exists "Authenticated users can update tariffs" on tariffs;
drop policy if exists "Authenticated users can delete tariffs" on tariffs;
drop policy if exists "Super admins can insert tariffs" on tariffs;
drop policy if exists "Super admins can update tariffs" on tariffs;
drop policy if exists "Super admins can delete tariffs" on tariffs;

create policy "Super admins can insert tariffs" on tariffs 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can update tariffs" on tariffs 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can delete tariffs" on tariffs 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- HOUSEBOAT PRICES: Only super admins can modify
drop policy if exists "Authenticated users can insert prices" on houseboat_prices;
drop policy if exists "Authenticated users can update prices" on houseboat_prices;
drop policy if exists "Authenticated users can delete prices" on houseboat_prices;
drop policy if exists "Super admins can insert prices" on houseboat_prices;
drop policy if exists "Super admins can update prices" on houseboat_prices;
drop policy if exists "Super admins can delete prices" on houseboat_prices;

create policy "Super admins can insert prices" on houseboat_prices 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can update prices" on houseboat_prices 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can delete prices" on houseboat_prices 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- CLIENTS: Staff with manage permission can modify
drop policy if exists "Authenticated users can insert clients" on clients;
drop policy if exists "Authenticated users can update clients" on clients;
drop policy if exists "Authenticated users can delete clients" on clients;
drop policy if exists "Staff can insert clients" on clients;
drop policy if exists "Staff can update clients" on clients;
drop policy if exists "Staff can delete clients" on clients;

create policy "Staff can insert clients" on clients 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        (profiles.permissions->>'canManageClients')::boolean = true
        or (profiles.permissions->>'isSuperAdmin')::boolean = true
      )
    )
  );

create policy "Staff can update clients" on clients 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        (profiles.permissions->>'canManageClients')::boolean = true
        or (profiles.permissions->>'isSuperAdmin')::boolean = true
      )
    )
  );

create policy "Staff can delete clients" on clients 
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- SITE SETTINGS: Only super admins can modify
drop policy if exists "Authenticated users can update settings" on site_settings;
drop policy if exists "Authenticated users can insert settings" on site_settings;
drop policy if exists "Super admins can update settings" on site_settings;
drop policy if exists "Super admins can insert settings" on site_settings;

create policy "Super admins can insert settings" on site_settings 
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

create policy "Super admins can update settings" on site_settings 
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.permissions->>'isSuperAdmin')::boolean = true
    )
  );

-- =====================================================
-- ENABLE REALTIME FOR SECURITY LOGS (Optional)
-- =====================================================

-- Uncomment if you want real-time security monitoring
-- alter publication supabase_realtime add table security_logs;

-- =====================================================
-- SUMMARY
-- =====================================================
-- 
-- Tables Created:
--   - security_logs: Audit trail for security events
--   - auth_attempts: Rate limiting tracking
--
-- RLS Policies Updated:
--   - bookings: Only staff with edit permission can modify
--   - houseboat_models: Only super admins can modify
--   - boats: Only super admins can modify
--   - tariffs: Only super admins can modify
--   - houseboat_prices: Only super admins can modify
--   - clients: Only staff with manage permission can modify
--   - site_settings: Only super admins can modify
--
-- =====================================================
