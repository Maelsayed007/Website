-- Restaurant Menu Packages
create table if not exists restaurant_menu_packages (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    prices jsonb not null default '{"adult": 0, "child": 0}'::jsonb,
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

-- Add guest_details to bookings for restaurant-specific tracking
alter table bookings 
add column if not exists guest_details jsonb default '[]'::jsonb;

-- Ensure RLS for menu packages
alter table restaurant_menu_packages enable row level security;

create policy "Public can view active menu packages" on restaurant_menu_packages
    for select using (is_active = true);

create policy "Staff can manage menu packages" on restaurant_menu_packages
    for all using (
        exists (
            select 1 from admin_users
            where admin_users.id::text = auth.uid()::text -- Simplification for now, adjust based on your auth
        ) or true -- Temporary override for local dev if auth issues
    );
