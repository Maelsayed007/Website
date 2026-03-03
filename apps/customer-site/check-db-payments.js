const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('--- DB CHECK ---');

    // Check bookings with client 'test' or id like f6e7
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .or('client_name.ilike.test,id.ilike.f6e7%');

    if (bError) console.error('Bookings Error:', bError.message);
    else console.log('Bookings found:', bookings.length, bookings.map(b => ({ id: b.id, name: b.client_name, status: b.status, paid: b.amount_paid, total: b.total_price })));

    // Check payments
    const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (pError) console.error('Payments Error:', pError.message);
    else console.log('Recent Payments:', payments);

    console.log('--- END DB CHECK ---');
}

check();
