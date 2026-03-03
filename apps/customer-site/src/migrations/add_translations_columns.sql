-- Add translations column to support multi-language dynamic content
-- Standard structure for JSONB: { "en": { "field": "value" }, "pt": { ... } }

-- 1. Houseboat Models
ALTER TABLE houseboat_models ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 2. Special Offers
ALTER TABLE special_offers ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 3. Restaurant Menu
ALTER TABLE restaurant_menu ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 4. Daily Travel Packages
ALTER TABLE daily_travel_packages ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 5. Extras
ALTER TABLE extras ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 6. Website Settings (optional, but good for future-proofing tagline/instructions)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
