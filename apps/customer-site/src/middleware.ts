import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_FILE = /\.(.*)$/i;
const ADMIN_SESSION_COOKIE = 'admin_session';

// Secret path for accessing admin login
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || 'marina-staff-2024';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  // 1. Skip public files and internal Next.js routes
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // 2. Handle Admin/Dashboard Security

  // A. Block direct access to /admin or /dashboard
  // Redirect to home to hide existence
  if (pathname === '/admin' || pathname === '/admin/login' || pathname.startsWith('/dashboard')) {
    // Check for valid session first to allow access to /dashboard if logged in
    const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE);

    // If trying to access dashboard AND has session -> Allow
    if (pathname.startsWith('/dashboard') && sessionCookie?.value) {
      return NextResponse.next();
    }

    // otherwise -> Block (Redirect to Home)
    return NextResponse.redirect(new URL('/', req.url));
  }

  // B. Handle Secret Path: /marina-staff-2024
  if (pathname === `/${ADMIN_SECRET_PATH}`) {
    const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE);

    if (sessionCookie?.value) {
      // 1. Logged In -> Redirect to Dashboard
      return NextResponse.redirect(new URL('/dashboard/houseboat-reservations', req.url));
    } else {
      // 2. Not Logged In -> Redirect to Staff Login
      // We use a redirect now so the URL changes to /staff-login, which solves the layout rendering issue
      return NextResponse.redirect(new URL('/staff-login', req.url));
    }
  }

  // 3. Allow /staff-login access
  if (pathname.startsWith('/staff-login')) {
    return NextResponse.next();
  }

  // 4. API Routes for Admin (allow them)
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // 5. Handle Supabase Session (for public site/customer login)
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
