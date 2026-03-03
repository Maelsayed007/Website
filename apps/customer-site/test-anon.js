const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Testing connectivity with Anon Key...');
    const { data, error } = await supabase.from('site_settings').select('*').limit(1);

    if (error) {
        console.error('Anon Key Error:', error);
    } else {
        console.log('Anon Key Success! Data:', data);
    }
}

run();
