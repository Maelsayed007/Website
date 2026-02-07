import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
    // These headers complement the ones in next.config.ts
    // They're added here for API routes and dynamic responses
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
}

/**
 * Check if a path is a protected dashboard route
 * NOTE: Dashboard routes are now handled by src/middleware.ts with custom admin_session auth
 */
function isProtectedRoute(pathname: string): boolean {
    return false; // Disable Supabase auth check for dashboard
}


/**
 * Check if a path is an authentication route
 */
function isAuthRoute(pathname: string): boolean {
    return pathname.startsWith('/login') || pathname.startsWith('/auth');
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Add security headers to all responses
    addSecurityHeaders(response);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    addSecurityHeaders(response);
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    addSecurityHeaders(response);
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Refresh session - this is the important part that keeps users logged in
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 1. Stealth Mode: Unauthenticated users cannot see protected routes (return 404)
    if (!user && isProtectedRoute(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = '/404';
        return NextResponse.rewrite(url);
    }

    // 2. Authenticated users on login page should be redirected
    if (user && isAuthRoute(pathname)) {
        // Fetch profile to determine where to redirect
        const { data: profile } = await supabase
            .from('profiles')
            .select('permissions')
            .eq('id', user.id)
            .single();

        const canAccessDashboard =
            profile?.permissions?.isSuperAdmin ||
            profile?.permissions?.canViewDashboard;

        const url = request.nextUrl.clone();
        url.pathname = canAccessDashboard ? '/dashboard/houseboat-reservations' : '/my-bookings';
        return NextResponse.redirect(url);
    }

    // 3. Stealth Mode: Authenticated users without staff permissions cannot see /dashboard or /admin (return 404)
    if (user && isProtectedRoute(pathname)) {
        // Fetch profile permissions
        const { data: profile } = await supabase
            .from('profiles')
            .select('permissions')
            .eq('id', user.id)
            .single();

        const canAccessDashboard =
            profile?.permissions?.isSuperAdmin ||
            profile?.permissions?.canViewDashboard;

        if (!canAccessDashboard) {
            const url = request.nextUrl.clone();
            url.pathname = '/404';
            return NextResponse.rewrite(url);
        }
    }

    return response;
}

