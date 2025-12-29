import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && user) {
            // Check if profile exists, if not create one with default Client permissions
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!profile) {
                const isAdminEmail = user.email === 'myasserofficial@gmail.com';
                await supabase.from('profiles').insert({
                    id: user.id,
                    username: user.user_metadata.full_name || user.email?.split('@')[0],
                    email: user.email,
                    role: isAdminEmail ? 'admin' : 'client',
                    permissions: {
                        isSuperAdmin: isAdminEmail,
                        canViewDashboard: isAdminEmail,
                        canViewHouseboatReservations: isAdminEmail,
                        canEditHouseboatReservations: isAdminEmail,
                        canManageStaff: isAdminEmail,
                        canManageClients: isAdminEmail
                    }
                });
            }

            const isAdminEmail = user.email === 'myasserofficial@gmail.com';
            const hasDashboardAccess = profile?.permissions?.canViewDashboard || profile?.permissions?.isSuperAdmin;

            const redirectUrl = (isAdminEmail || hasDashboardAccess) ? '/dashboard/houseboat-reservations' : '/my-bookings';
            return NextResponse.redirect(`${origin}${redirectUrl}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
