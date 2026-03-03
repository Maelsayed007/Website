const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Fetching admin_users...');
    const { data, error } = await supabase.from('admin_users').select('id, username, is_active');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('Current users:', data);

    // Now update the 'admin' user password
    const password = 'admin';
    const hash = await bcrypt.hash(password, 12);

    console.log('Updating password for user "admin"...');
    const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: hash, is_active: true })
        .eq('username', 'admin');

    if (updateError) {
        console.error('Error updating password:', updateError);
    } else {
        console.log('Password updated successfully for "admin"!');
    }
}

run();
