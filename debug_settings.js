
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Use service role if available for RLS bypass, otherwise anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSettings() {
    console.log('Checking settings for key: main');
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'main')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
    } else {
        console.log('Settings found raw:', JSON.stringify(data, null, 2));
        if (data.data && data.data.logoUrl) {
            console.log('Logo URL length:', data.data.logoUrl.length);
            console.log('Logo URL start:', data.data.logoUrl.substring(0, 50));
        } else {
            console.log('Logo URL is missing or empty inside data column');
        }
    }
}

checkSettings();
