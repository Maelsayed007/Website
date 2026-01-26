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
-- --- Phase 1 Migration: Real-time features ---

-- Activity Logs Table
create table if not exists activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  action text not null, -- 'booking_confirmed', 'payment_received', etc.
  details text,
  metadata jsonb, -- Store custom data
  timestamp timestamp with time zone default now()
);

alter table activity_logs enable row level security;
drop policy if exists "Logs are viewable by staff" on activity_logs;
create policy "Logs are viewable by staff" on activity_logs for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert logs" on activity_logs;
create policy "Authenticated users can insert logs" on activity_logs for insert with check (auth.role() = 'authenticated');

-- Availability Blocks Table
create table if not exists availability_blocks (
  id uuid default uuid_generate_v4() primary key,
  resource_type text, -- 'houseboat', 'restaurant'
  resource_id uuid,
  start_date date,
  end_date date,
  status text -- 'available', 'booked', 'maintenance'
);

alter table availability_blocks enable row level security;
drop policy if exists "Blocks are viewable by everyone" on availability_blocks;
create policy "Blocks are viewable by everyone" on availability_blocks for select using (true);
drop policy if exists "Authenticated users can manage blocks" on availability_blocks;
create policy "Authenticated users can manage blocks" on availability_blocks for all using (auth.role() = 'authenticated');

-- --- Notifications Support ---

-- Function for pg_notify
create or replace function notify_pending_bookings()
returns trigger as $$
begin
  perform pg_notify('new_booking', row_to_json(new)::text);
  return new;
end;
$$ language plpgsql;

-- Trigger for pending bookings
drop trigger if exists on_pending_booking on bookings;
create trigger on_pending_booking
  after insert on bookings
  for each row
  when (new.status = 'Pending')
  execute function notify_pending_bookings();

-- Ensure realtime is enabled for these tables
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table availability_blocks;
alter publication supabase_realtime add table bookings;
-- --- Additional Tables for Full Migration ---

-- Daily Travel Packages
create table if not exists daily_travel_packages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table daily_travel_packages enable row level security;
drop policy if exists "Packages viewable by everyone" on daily_travel_packages;
create policy "Packages viewable by everyone" on daily_travel_packages for select using (true);
drop policy if exists "Authenticated users can manage packages" on daily_travel_packages;
create policy "Authenticated users can manage packages" on daily_travel_packages for all using (auth.role() = 'authenticated');

-- Restaurant Tables
create table if not exists restaurant_tables (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  capacity integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table restaurant_tables enable row level security;
drop policy if exists "Tables viewable by everyone" on restaurant_tables;
create policy "Tables viewable by everyone" on restaurant_tables for select using (true);
drop policy if exists "Authenticated users can manage tables" on restaurant_tables;
create policy "Authenticated users can manage tables" on restaurant_tables for all using (auth.role() = 'authenticated');

-- Restaurant Menu
create table if not exists restaurant_menu (
  id uuid default uuid_generate_v4() primary key,
  category text not null,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table restaurant_menu enable row level security;
drop policy if exists "Menu viewable by everyone" on restaurant_menu;
create policy "Menu viewable by everyone" on restaurant_menu for select using (true);

-- Testimonials
create table if not exists testimonials (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  content text not null,
  rating integer check (rating >= 1 and rating <= 5),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table testimonials enable row level security;
drop policy if exists "Testimonials viewable by everyone" on testimonials;
create policy "Testimonials viewable by everyone" on testimonials for select using (true);

-- Vouchers
create table if not exists vouchers (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  discount_type text check (discount_type in ('percentage', 'fixed')),
  value numeric not null,
  expiry_date date,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table vouchers enable row level security;
drop policy if exists "Vouchers viewable by admins" on vouchers;
create policy "Vouchers viewable by admins" on vouchers for all using (auth.role() = 'authenticated');

-- Extras
create table if not exists extras (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table extras enable row level security;
drop policy if exists "Extras viewable by everyone" on extras;
create policy "Extras viewable by everyone" on extras for select using (true);

-- Ensure realtime is enabled for new tables
alter publication supabase_realtime add table daily_travel_packages;
alter publication supabase_realtime add table restaurant_tables;
alter publication supabase_realtime add table testimonials;

 c r e a t e   t a b l e   i f   n o t   e x i s t s   d a i l y _ b o a t s   ( 
         i d   u u i d   d e f a u l t   u u i d _ g e n e r a t e _ v 4 ( )   p r i m a r y   k e y , 
         n a m e   t e x t   n o t   n u l l , 
         c a p a c i t y   i n t e g e r , 
         c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l 
 ) ; 
 
 c r e a t e   t a b l e   i f   n o t   e x i s t s   d a i l y _ t r a v e l _ p a c k a g e s   ( 
         i d   u u i d   d e f a u l t   u u i d _ g e n e r a t e _ v 4 ( )   p r i m a r y   k e y , 
         n a m e   t e x t   n o t   n u l l , 
         b o a t _ i d   u u i d   r e f e r e n c e s   d a i l y _ b o a t s ( i d ) , 
         p h o t o _ u r l   t e x t , 
         d u r a t i o n _ h o u r s   d e c i m a l , 
         d e s t i n a t i o n   t e x t , 
         p r i c i n g   j s o n b , 
         t e r m s   j s o n b , 
         c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l 
 ) ; 
  
 
 c r e a t e   t a b l e   i f   n o t   e x i s t s   w e b s i t e _ s e t t i n g s   ( 
         i d   t e x t   p r i m a r y   k e y , 
         p d f _ t e r m s _ a n d _ c o n d i t i o n s   t e x t , 
         p d f _ o t h e r _ d e t a i l s   t e x t , 
         u p d a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l 
 ) ; 
 
 i n s e r t   i n t o   w e b s i t e _ s e t t i n g s   ( i d ,   p d f _ t e r m s _ a n d _ c o n d i t i o n s ,   p d f _ o t h e r _ d e t a i l s )   v a l u e s   ( ' m a i n ' ,   ' ' ,   ' ' )   o n   c o n f l i c t   ( i d )   d o   n o t h i n g ; 
  
 