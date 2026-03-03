const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    console.log('Inspecting payments table schema...');

    // We can try to select one row and see the keys
    const { data, error } = await supabase.from('payments').select('*').limit(1);

    if (error) {
        console.error('Error fetching data:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data in payments table, trying to insert a dummy row to see columns (if successful then rollback?)');
        // Better: let's try to query information_schema if we have permissions, but usually we don't via JS.
        // Let's just assume we need to add metadata if it's not there.
    }
}

inspectSchema();
