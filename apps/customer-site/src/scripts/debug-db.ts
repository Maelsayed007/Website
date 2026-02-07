
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking 'houseboats' table...");
    const { data: boats, error: boatError } = await supabase.from('houseboats').select('*');
    if (boatError) console.error("Error fetching boats:", boatError);
    else console.log(`Found ${boats?.length} boats:`, boats);

    console.log("\nChecking 'bookings' table (Recent)...");
    const { data: bookings, error: bookError } = await supabase.from('bookings').select('*').limit(1);
    if (bookError) console.error("Error fetching bookings:", bookError);
    else console.log(`Found bookings sample keys:`, Object.keys(bookings?.[0] || {}));
}

checkData();
