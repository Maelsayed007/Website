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
                // New users get client role with no dashboard access by default
                // Super admin can grant permissions via dashboard
                await supabase.from('profiles').insert({
                    id: user.id,
                    username: user.user_metadata.full_name || user.email?.split('@')[0],
                    email: user.email,
                    role: 'client',
                    permissions: {
                        isSuperAdmin: false,
                        canViewDashboard: false,
                        canViewHouseboatReservations: false,
                        canEditHouseboatReservations: false,
                        canManageStaff: false,
                        canManageClients: false
                    }
                });

                // New users always go to my-bookings
                return NextResponse.redirect(`${origin}/my-bookings`);
            }

            // Database-driven permission check (no hardcoded emails)
            const hasDashboardAccess =
                profile?.permissions?.canViewDashboard ||
                profile?.permissions?.isSuperAdmin;

            const redirectUrl = hasDashboardAccess
                ? '/dashboard/houseboat-reservations'
                : '/my-bookings';
            return NextResponse.redirect(`${origin}${redirectUrl}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

