const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugPayments() {
    console.log('--- FETCHING PAYMENTS ---');
    const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('*, bookings(client_name)')
        .order('created_at', { ascending: false });

    if (pError) {
        console.error('Payment Error:', pError);
    } else {
        console.log(`Found ${payments?.length || 0} payments:`);
        payments?.forEach(p => {
            console.log(`ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}, Client: ${p.bookings?.client_name || 'N/A'}, Created: ${p.created_at}`);
        });
    }

    console.log('\n--- FETCHING RECENT BOOKINGS ---');
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, client_name, amount_paid, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (bError) {
        console.error('Booking Error:', bError);
    } else {
        bookings?.forEach(b => {
            console.log(`ID: ${b.id}, Client: ${b.client_name}, Paid: ${b.amount_paid}, Status: ${b.status}, Created: ${b.created_at}`);
        });
    }
}

debugPayments();
