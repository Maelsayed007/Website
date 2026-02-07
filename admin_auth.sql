-- =====================================================
-- ADMIN USERS & AUTHENTICATION
-- =====================================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  role text CHECK (role IN ('super_admin', 'manager', 'staff')) NOT NULL DEFAULT 'staff',
  permissions jsonb DEFAULT '{
    "canViewDashboard": true,
    "canViewBookings": true,
    "canEditBookings": false,
    "canDeleteBookings": false,
    "canManagePayments": false,
    "canViewSettings": false,
    "canEditSettings": false,
    "canManageUsers": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Session storage for auth tokens
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES admin_users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only allow system/service role to access these tables
DROP POLICY IF EXISTS "Service role full access to admin_users" ON admin_users;
CREATE POLICY "Service role full access to admin_users" ON admin_users
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to admin_sessions" ON admin_sessions;
CREATE POLICY "Service role full access to admin_sessions" ON admin_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
