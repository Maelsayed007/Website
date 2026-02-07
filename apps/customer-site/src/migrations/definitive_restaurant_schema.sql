
-- definitive_restaurant_schema.sql
-- This script unifies the restaurant menu schema and ensures all necessary tables exist.

-- 1. Drop old/conflicting tables if they exist
-- DROP TABLE IF EXISTS restaurant_menu CASCADE; -- Uncomment if you want to start fresh with categories

-- 2. Create Categories table
CREATE TABLE IF NOT EXISTS restaurant_menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Items table
CREATE TABLE IF NOT EXISTS restaurant_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES restaurant_menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT, -- Stored as text for flexibility (e.g. "€24.00" or "Market Price")
    ingredients TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Packages table
CREATE TABLE IF NOT EXISTS restaurant_menu_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    prices JSONB NOT NULL DEFAULT '{"adult": 0, "child": 0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Update Bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_details JSONB DEFAULT '[]';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0;

-- 6. Enable RLS
ALTER TABLE restaurant_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_packages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Public access to categories" ON restaurant_menu_categories;
CREATE POLICY "Public access to categories" ON restaurant_menu_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage categories" ON restaurant_menu_categories;
CREATE POLICY "Admin manage categories" ON restaurant_menu_categories FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public access to items" ON restaurant_menu_items;
CREATE POLICY "Public access to items" ON restaurant_menu_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage items" ON restaurant_menu_items;
CREATE POLICY "Admin manage items" ON restaurant_menu_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public access to packages" ON restaurant_menu_packages;
CREATE POLICY "Public access to packages" ON restaurant_menu_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage packages" ON restaurant_menu_packages;
CREATE POLICY "Admin manage packages" ON restaurant_menu_packages FOR ALL USING (auth.role() = 'authenticated');

-- 8. Create Payments table
CREATE TABLE IF NOT EXISTS restaurant_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method TEXT CHECK (method IN ('cash', 'card', 'transfer', 'stripe', 'other')),
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable RLS for Payments
ALTER TABLE restaurant_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage payments" ON restaurant_payments;
CREATE POLICY "Admin manage payments" ON restaurant_payments FOR ALL USING (auth.role() = 'authenticated');
