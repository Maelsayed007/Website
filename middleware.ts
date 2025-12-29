import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALE_PREFIX = /^\/(en|pt|fr|de|es|it|nl)(\/|$)/i;
const PUBLIC_FILE = /\.(.*)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip for public files and Next internal routes
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return;
  }

  // If path starts with a locale, strip it and redirect
  const match = pathname.match(LOCALE_PREFIX);
  if (match) {
    const withoutLocale = pathname.replace(LOCALE_PREFIX, '/');
    const url = req.nextUrl.clone();
    url.pathname = withoutLocale === '' ? '/' : withoutLocale;
    return NextResponse.redirect(url);
  }

  return;
}

export const config = {
  matcher: ['/((?!_next|api|\\..*).*)'],
};
