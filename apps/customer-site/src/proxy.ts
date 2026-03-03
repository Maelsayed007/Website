import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_FILE = /\.(.*)$/i;
const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_CACHE_TTL_MS = 30_000;
const adminSessionCache = new Map<string, { valid: boolean; expiresAt: number }>();

async function hasValidAdminSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;

  const now = Date.now();
  const cached = adminSessionCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.valid;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return false;

  const nowIso = new Date().toISOString();
  const url = new URL('/rest/v1/admin_sessions', supabaseUrl);
  url.searchParams.set('select', 'token');
  url.searchParams.set('token', `eq.${token}`);
  url.searchParams.set('expires_at', `gt.${nowIso}`);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    adminSessionCache.set(token, { valid: false, expiresAt: now + 5_000 });
    return false;
  }
  const data = await response.json();
  const valid = Array.isArray(data) && data.length > 0;
  adminSessionCache.set(token, { valid, expiresAt: now + ADMIN_SESSION_CACHE_TTL_MS });
  return valid;
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  // 1. Skip public files and internal Next.js routes
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  const disabledCustomerAuthRoutes = [
    '/login',
    '/register',
    '/my-bookings',
    '/confirm-email',
    '/auth/callback',
    '/auth',
  ];
  if (disabledCustomerAuthRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const isDashboardPath = pathname.startsWith('/dashboard');
  const isAdminPath = pathname === '/admin';

  // 2. Handle Admin/Dashboard Security on truly protected paths only
  if (isDashboardPath || isAdminPath) {
    if (!req.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
      return NextResponse.redirect(new URL('/staff-login', req.url));
    }

    const hasSession = await hasValidAdminSession(req);
    if (!hasSession) {
      return NextResponse.redirect(new URL('/staff-login', req.url));
    }

    // Lock Dashboard to EN or PT
    const localeCookie = req.cookies.get('NEXT_LOCALE')?.value || 'en';
    if (localeCookie !== 'en' && localeCookie !== 'pt') {
      const response = NextResponse.redirect(new URL(pathname, req.url));
      response.cookies.set('NEXT_LOCALE', 'en');
      return response;
    }

    return NextResponse.next();
  }

  // 3. Allow /staff-login access
  if (pathname.startsWith('/staff-login')) {
    return NextResponse.next();
  }

  // 4. Public paths do not require customer authentication
  return await updateSession(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
