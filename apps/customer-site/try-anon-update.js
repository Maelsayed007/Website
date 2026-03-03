const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Testing Update via Anon Key...');
    const password = 'admin';
    const hash = await bcrypt.hash(password, 12);

    const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: hash })
        .eq('username', 'admin');

    if (error) {
        console.error('Anon Update Error:', error.message);
    } else {
        console.log('Anon Update Success! Password reset to "admin".');
    }
}

run();
