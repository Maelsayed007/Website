const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Testing Anon Key on payments table...');
    const { data, error } = await supabase.from('payments').select('*');

    if (error) {
        console.error('Anon Access Error:', error.message);
    } else {
        console.log('Anon Access Success! Payments:', data.length);
    }
}

run();
