const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Testing Anon Key on admin_users table...');
    const { data, error } = await supabase.from('admin_users').select('username').limit(1);

    if (error) {
        console.error('Anon Access Error:', error.message);
    } else {
        console.log('Anon Access Success! Users:', data);
    }
}

run();
