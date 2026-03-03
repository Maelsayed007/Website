'use client';

import Image from 'next/image';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { HeaderDesktopNav } from './header-desktop-nav';
import { HeaderMobileNav } from './header-mobile-nav';
import { SUPPORTED_LOCALES } from './service-items';
import type { HeaderProps } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

export default function Header({
  navigation,
  websiteSettings,
  isFixed = true,
  compact = false,
  fullWidth = false,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFixed) return;
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFixed]);

  const currentLocale = (mounted && Cookies.get('NEXT_LOCALE')) || 'en';
  const isCompact = compact || (isFixed && isScrolled);

  const handleLanguageChange = (val: string) => {
    Cookies.set('NEXT_LOCALE', val, { expires: 365 });
    router.refresh();
  };

  const tabClasses = (isActive: boolean) =>
    cn(
      'h-10 px-5 py-1.5 rounded-full text-[0.9rem] font-semibold tracking-tight transition-all duration-200 flex items-center gap-2 whitespace-nowrap outline-none',
      isActive
        ? 'bg-[#2b5fd8] text-white'
        : 'bg-transparent text-slate-600 hover:text-slate-900'
    );

  return (
    <header
      className={cn(
        'z-40 w-full transition-all duration-300',
        isFixed ? 'fixed inset-x-0 top-0' : 'absolute inset-x-0 top-0'
      )}
    >
      <div
        className={cn(
          'relative z-10 overflow-hidden border-b border-slate-200 bg-white transition-all duration-300',
          'shadow-none'
        )}
      >
        <div className={cn('mx-auto w-full max-w-[1420px] px-4 md:px-6 lg:px-8', fullWidth && 'max-w-[1420px]')}>
          <div className={cn('grid items-center gap-3', isCompact ? 'h-[60px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'h-[70px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')}>
            <div className="flex items-center justify-start">
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src={websiteSettings?.logoUrl || '/amieira-logo.png'}
                  alt={websiteSettings?.companyName || 'Amieira Marina'}
                  width={isCompact ? 140 : 174}
                  height={isCompact ? 44 : 56}
                  className={cn('w-auto object-contain', isCompact ? 'h-10' : 'h-14')}
                  priority
                />
              </Link>
            </div>

            <div className="flex justify-self-center justify-center">
              <HeaderDesktopNav
                pathname={pathname}
                navigation={navigation}
                tabClasses={tabClasses}
              />
            </div>

            <div className="flex min-w-0 justify-self-end items-center justify-end gap-2">
              <Link
                href="/contact"
                className={cn(
                  'cta-shimmer hidden h-9 items-center justify-center rounded-full border-none px-4 text-[0.82rem] font-semibold text-white lg:inline-flex',
                  pathname === '/contact' && 'pointer-events-none opacity-95'
                )}
                aria-current={pathname === '/contact' ? 'page' : undefined}
              >
                {navigation?.links?.contact || 'Contact Us'}
              </Link>

              <div className="flex items-center">
                <Select defaultValue={currentLocale} onValueChange={handleLanguageChange}>
                  <SelectTrigger className={cn(
                    'w-[58px] h-9 rounded-full focus:ring-0 focus:ring-offset-0 p-0 transition-all text-[0.76rem] font-black justify-center',
                    'border border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                  )}>
                    {currentLocale.charAt(0).toUpperCase() + currentLocale.slice(1)}
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[80px] rounded-lg shadow-xl border-none">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <SelectItem key={lang} value={lang} className="rounded-xl focus:bg-emerald-50 font-bold">
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <HeaderMobileNav
                pathname={pathname}
                navigation={navigation}
                websiteSettings={websiteSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
