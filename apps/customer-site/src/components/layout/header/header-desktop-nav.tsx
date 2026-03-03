'use client';

import Link from 'next/link';

type HeaderDesktopNavProps = {
  pathname: string;
  navigation: {
    links: {
      home?: string;
      houseboats: string;
      riverCruise: string;
      restaurant: string;
    };
  };
  tabClasses: (isActive: boolean) => string;
};

export function HeaderDesktopNav({
  pathname,
  navigation,
  tabClasses,
}: HeaderDesktopNavProps) {
  return (
    <nav className="hidden lg:flex items-center justify-center gap-2 bg-transparent px-0 py-0" aria-label="Primary navigation">
      <Link href="/" className={tabClasses(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined}>
        {navigation?.links?.home || 'Home'}
      </Link>

      <Link href="/houseboats" className={tabClasses(pathname === '/houseboats')} aria-current={pathname === '/houseboats' ? 'page' : undefined}>
        {navigation?.links?.houseboats || 'Houseboats'}
      </Link>

      <Link href="/river-cruise" className={tabClasses(pathname === '/river-cruise')} aria-current={pathname === '/river-cruise' ? 'page' : undefined}>
        {navigation?.links?.riverCruise || 'River Cruise'}
      </Link>

      <Link href="/restaurant" className={tabClasses(pathname === '/restaurant')} aria-current={pathname === '/restaurant' ? 'page' : undefined}>
        {navigation?.links?.restaurant || 'Restaurant'}
      </Link>
    </nav>
  );
}
