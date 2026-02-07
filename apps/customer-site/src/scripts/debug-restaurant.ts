
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRestaurantData() {
    console.log("--- Checking Restaurant Schema ---");

    console.log("\n1. Checking 'restaurant_menu_categories' table...");
    const { data: menu, error: menuError } = await supabase.from('restaurant_menu_categories').select('*');
    if (menuError) {
        console.error("Error fetching restaurant_menu_categories:", menuError.message, menuError.code);
    } else {
        console.log(`Found ${menu?.length} categories:`, menu.map(m => m.name));
    }

    console.log("\n2. Checking 'restaurant_menu_items' table...");
    const { data: items, error: itemsError } = await supabase.from('restaurant_menu_items').select('*').limit(5);
    if (itemsError) {
        console.error("Error fetching restaurant_menu_items:", itemsError.message, itemsError.code);
    } else {
        console.log(`Found ${items?.length} items sample:`, items.map(i => i.name));
    }

    console.log("\n3. Checking 'restaurant_menu_packages' table...");
    const { data: packages, error: pkgError } = await supabase.from('restaurant_menu_packages').select('*');
    if (pkgError) {
        console.error("Error fetching restaurant_menu_packages:", pkgError.message, pkgError.code);
    } else {
        console.log(`Found ${packages?.length} packages:`, packages.map(p => p.name));
    }
}

checkRestaurantData().catch(console.error);
