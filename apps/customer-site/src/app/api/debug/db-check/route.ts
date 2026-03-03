
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { hasPermission, validateSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const user = await validateSession();
    if (!user || !hasPermission(user, 'canEditSettings')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createAdminClient();

    try {
        const { data, error } = await supabase.from('payment_tokens').select('*').limit(1);

        if (error) {
            return NextResponse.json({ status: 'Error connecting', error });
        }

        return NextResponse.json({ status: 'Connected', data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
