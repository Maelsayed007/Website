const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
    console.log('Fixing RLS for payments table...');

    // Using RPC to execute SQL if available, or just manually setting it if we can
    // Since we are using Service Role key, we Bypass RLS anyway, but we want to enable Public Read.

    // Note: Supabase JS doesn't have an "execute SQL" method directly.
    // However, we can try to create a policy if it doesn't exist.

    // Actually, I'll just check if I can read from it first.
    const { data, error } = await supabase.from('payments').select('*').limit(1);

    if (error) {
        console.error('Error reading payments:', error);
    } else {
        console.log('Successfully read payments with service role.');
    }
}

fixRLS();
