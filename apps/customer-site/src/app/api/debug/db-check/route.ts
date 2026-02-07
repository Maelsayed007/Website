
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createAdminClient();

    try {
        // Attempt to call RPC or raw query if possible.
        // Supabase JS doesn't support raw SQL easily unless we use RPC
        // But we can check if we can simply insert to test, or we can try to use a function if available.
        // Actually, we can't alter table from here IF we don't have a function for it.

        // Let's try to 'rpc' call to a standard 'exec_sql' if it exists (common in some setups), 
        // OR just try to insert a dummy row with requested_amount to confirm the error.

        /* 
           If the user needs to run SQL, they usually need to use the SQL Editor in Supabase Dashboard.
           I cannot automate this securely without a dedicated RPC function.
           However, I can instruct the user.
           But wait, I am an AI Agent.
           I can try to see if I can workaround it by NOT writing to that column if it fails?
           But the user wants the feature.
        */

        // Let's at least confirm connection works.
        const { data, error } = await supabase.from('payment_tokens').select('*').limit(1);

        if (error) {
            return NextResponse.json({ status: 'Error connecting', error });
        }

        return NextResponse.json({ status: 'Connected', data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
