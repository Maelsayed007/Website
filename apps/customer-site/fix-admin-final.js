const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('--- ADMIN FIX START ---');
    const password = 'admin';
    const hash = await bcrypt.hash(password, 12);

    // 1. Fetch user to see status
    const { data: user, error: fetchError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', 'admin')
        .single();

    if (fetchError) {
        console.error('Fetch Error:', fetchError.message);
        return;
    }

    console.log('Current Admin Status:', {
        username: user.username,
        is_active: user.is_active,
        role: user.role
    });

    // 2. Update status and password
    console.log('Updating user "admin" to active and setting password to "admin"...');
    const { error: updateError } = await supabase
        .from('admin_users')
        .update({
            password_hash: hash,
            is_active: true
        })
        .eq('username', 'admin');

    if (updateError) {
        console.error('Update Error:', updateError.message);
    } else {
        console.log('Success! User "admin" is now active with password "admin".');
    }

    // 3. Double check
    const { data: check } = await supabase.from('admin_users').select('is_active').eq('username', 'admin').single();
    console.log('Verified is_active:', check?.is_active);
    console.log('--- ADMIN FIX END ---');
}

run();
