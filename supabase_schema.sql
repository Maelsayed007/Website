-- Migration to Supabase

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text,
  permissions jsonb default '{"isSuperAdmin": false, "canEditHouseboatReservations": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Houseboat Models
create table if not exists houseboat_models (
  id text primary key, -- keeping string IDs to match existing data if possible, or use uuid
  name text not null,
  description text,
  optimal_capacity integer,
  maximum_capacity integer,
  kitchens integer,
  bathrooms integer,
  bedrooms integer,
  single_beds integer,
  double_beds integer,
  amenities jsonb,
  image_urls text[],
  slug text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tariffs Table (New)
create table if not exists tariffs (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  periods jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pricing (Subcollection in Firestore, separate table here)
create table if not exists houseboat_prices (
  id uuid default uuid_generate_v4() primary key,
  model_id text references houseboat_models(id) on delete cascade,
  tariff_id uuid references tariffs(id) on delete set null, -- changed to reference tariffs table
  weekday_price numeric,
  weekend_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(model_id, tariff_id)
);

-- Boats (Individual Units - previously subcollection)
create table if not exists boats (
  id uuid default uuid_generate_v4() primary key,
  model_id text references houseboat_models(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  booking_ids text[], -- Array of booking IDs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookings
create table if not exists bookings (
  id text primary key, -- keeping text ID for compatibility with existing or use uuid
  houseboat_id text references houseboat_models(id),
  client_name text,
  client_email text,
  client_phone text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('Confirmed', 'Pending', 'Maintenance', 'Cancelled')),
  source text,
  price numeric,
  discount numeric,
  notes text,
  daily_travel_package_id text,
  restaurant_table_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Website Settings
create table if not exists site_settings (
  key text primary key,
  data jsonb not null
);

-- RLS Policies
-- We drop policies first to ensure idempotency (so you can run this script multiple times)

-- PROFILES
alter table profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- HOUSEBOAT MODELS
alter table houseboat_models enable row level security;
drop policy if exists "Models are viewable by everyone." on houseboat_models;
create policy "Models are viewable by everyone." on houseboat_models for select using (true);

drop policy if exists "Authenticated users can insert models" on houseboat_models;
create policy "Authenticated users can insert models" on houseboat_models for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update models" on houseboat_models;
create policy "Authenticated users can update models" on houseboat_models for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete models" on houseboat_models;
create policy "Authenticated users can delete models" on houseboat_models for delete using (auth.role() = 'authenticated');

-- HOUSEBOAT PRICES
alter table houseboat_prices enable row level security;
drop policy if exists "Prices viewable by everyone" on houseboat_prices;
create policy "Prices viewable by everyone" on houseboat_prices for select using (true);

drop policy if exists "Authenticated users can insert prices" on houseboat_prices;
create policy "Authenticated users can insert prices" on houseboat_prices for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update prices" on houseboat_prices;
create policy "Authenticated users can update prices" on houseboat_prices for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete prices" on houseboat_prices;
create policy "Authenticated users can delete prices" on houseboat_prices for delete using (auth.role() = 'authenticated');

-- BOATS
alter table boats enable row level security;
drop policy if exists "Boats viewable by everyone" on boats;
create policy "Boats viewable by everyone" on boats for select using (true);

drop policy if exists "Authenticated users can insert boats" on boats;
create policy "Authenticated users can insert boats" on boats for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update boats" on boats;
create policy "Authenticated users can update boats" on boats for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete boats" on boats;
create policy "Authenticated users can delete boats" on boats for delete using (auth.role() = 'authenticated');

-- BOOKINGS
alter table bookings enable row level security;
drop policy if exists "Bookings viewable by everyone" on bookings;
create policy "Bookings viewable by everyone" on bookings for select using (true);

drop policy if exists "Authenticated users can insert bookings" on bookings;
create policy "Authenticated users can insert bookings" on bookings for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update bookings" on bookings;
create policy "Authenticated users can update bookings" on bookings for update using (auth.role() = 'authenticated');

-- TARIFFS
alter table tariffs enable row level security;
drop policy if exists "Tariffs viewable by everyone" on tariffs;
create policy "Tariffs viewable by everyone" on tariffs for select using (true);

drop policy if exists "Authenticated users can insert tariffs" on tariffs;
create policy "Authenticated users can insert tariffs" on tariffs for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update tariffs" on tariffs;
create policy "Authenticated users can update tariffs" on tariffs for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete tariffs" on tariffs;
create policy "Authenticated users can delete tariffs" on tariffs for delete using (auth.role() = 'authenticated');

-- CLIENTS
alter table clients enable row level security;
drop policy if exists "Clients viewable by everyone" on clients;
create policy "Clients viewable by everyone" on clients for select using (true);

drop policy if exists "Authenticated users can insert clients" on clients;
create policy "Authenticated users can insert clients" on clients for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update clients" on clients;
create policy "Authenticated users can update clients" on clients for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete clients" on clients;
create policy "Authenticated users can delete clients" on clients for delete using (auth.role() = 'authenticated');

-- SITE SETTINGS
alter table site_settings enable row level security;
drop policy if exists "Settings viewable by everyone" on site_settings;
create policy "Settings viewable by everyone" on site_settings for select using (true);

drop policy if exists "Authenticated users can update settings" on site_settings;
create policy "Authenticated users can update settings" on site_settings for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert settings" on site_settings;
create policy "Authenticated users can insert settings" on site_settings for insert with check (auth.role() = 'authenticated');
