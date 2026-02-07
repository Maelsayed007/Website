
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

async function checkColumns() {
    console.log('Checking columns for table: bookings');
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data found in bookings table to check columns.');
        console.log('Attempting to select payment columns directly...');
        const { error: pError } = await supabase.from('bookings').select('amount_paid, payment_status').limit(1);
        if (pError) {
            console.log('Payment columns NOT found:', pError.message);
        } else {
            console.log('Payment columns FOUND.');
        }
    }
}

checkColumns();
