const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMetadataColumn() {
    console.log('Adding metadata column to payments table...');

    // Since we don't have a direct SQL execution tool through JS client easily (unless we use an RPC),
    // we can try to use a "hacker" way if RLS allows, but usually with Service Role we can't do DDL.
    // However, I can try to use the 'rpc' method if 'exec_sql' exists (common in some Supabase templates).

    // If not, I'll just have to hope the user applies it or I can find another way.
    // Actually, I can try to insert a row with a 'metadata' field and see if it fails.

    const { error } = await supabase.from('payments').insert({
        booking_id: '00000000-0000-0000-0000-000000000000',
        amount: 0,
        status: 'test',
        metadata: { info: 'testing column' }
    });

    if (error && error.message.includes('column "metadata" of relation "payments" does not exist')) {
        console.log('Column "metadata" does not exist. Please add it via Supabase Dashboard:');
        console.log('ALTER TABLE payments ADD COLUMN metadata JSONB DEFAULT \'{}\'::jsonb;');
    } else if (error) {
        console.error('Error (might be RLS or something else):', error.message);
    } else {
        console.log('Successfully inserted metadata! Column exists.');
        // Clean up
        await supabase.from('payments').delete().eq('status', 'test');
    }
}

addMetadataColumn();
