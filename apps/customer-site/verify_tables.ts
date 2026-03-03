
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName: string) {
    const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (error) {
        console.log(`Table '${tableName}': ERROR - ${error.message}`);
    } else {
        console.log(`Table '${tableName}': EXISTS (Rows: ${count})`);
    }
}

async function main() {
    console.log('--- Verifying Restaurant Tables ---');
    await checkTable('restaurant_menus'); // Used in Settings
    await checkTable('menu_dishes'); // Used in Settings
    await checkTable('restaurant_menu_categories'); // Used in Settings
    await checkTable('restaurant_menu_items'); // Used in Settings
    await checkTable('restaurant_menu_packages'); // Used in Reservations Page ??
    await checkTable('bookings');
}

main();
