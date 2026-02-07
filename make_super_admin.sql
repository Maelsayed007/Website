-- =====================================================
-- MAKE ME SUPER ADMIN
-- =====================================================
-- Replace 'YOUR_EMAIL@EXAMPLE.COM' with your actual email address
-- Run this in the Supabase SQL Editor

update profiles
set permissions = jsonb_set(
  jsonb_set(
    permissions, 
    '{isSuperAdmin}', 
    'true'
  ),
  '{canViewDashboard}',
  'true'
)
where email = 'myasserofficial@gmail.com'; -- <--- CHANGE THIS IF NEEDED

-- Verify the change
select * from profiles where email = 'myasserofficial@gmail.com';
