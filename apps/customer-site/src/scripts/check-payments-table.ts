
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking for table: restaurant_payments');
    const { data, error } = await supabase
        .from('restaurant_payments')
        .select('*')
        .limit(1);

    if (error) {
        if (error.message.includes('relation "restaurant_payments" does not exist')) {
            console.log('Table restaurant_payments DOES NOT exist.');
        } else {
            console.error('Error fetching from restaurant_payments:', error.message);
        }
    } else {
        console.log('Table restaurant_payments EXISTS.');
        if (data && data.length > 0) {
            console.log('Sample columns:', Object.keys(data[0]));
        }
    }
}

checkTable();
