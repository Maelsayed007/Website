'use client';

import Link from 'next/link';
import {
  LayoutGrid,
  Mail,
  Menu,
  Ship,
  Waves,
  Utensils,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type HeaderMobileNavProps = {
  pathname: string;
  navigation: {
    links: {
      home?: string;
      houseboats: string;
      riverCruise: string;
      restaurant: string;
      contact?: string;
    };
  };
  websiteSettings?: {
    companyName?: string;
  } | null;
};

export function HeaderMobileNav({
  pathname,
  navigation,
  websiteSettings,
}: HeaderMobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" className="text-gray-700 rounded-[0.8rem] border border-slate-200 bg-white hover:bg-slate-50">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-[#f8fbff] p-0 border-l border-slate-200">
        <SheetHeader className="p-6 border-b border-slate-200 bg-white/90">
          <SheetTitle className="text-left">{websiteSettings?.companyName || 'Menu'}</SheetTitle>
        </SheetHeader>
        <nav className="p-4 flex flex-col gap-1.5">
          <SheetClose asChild>
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
                pathname === '/' ? 'bg-brand-ink text-white' : 'text-gray-700 hover:bg-white'
              )}
            >
              <LayoutGrid className="h-5 w-5" /> {navigation?.links?.home || 'Home'}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/houseboats"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
                pathname === '/houseboats' ? 'bg-brand-ink text-white' : 'text-gray-700 hover:bg-white'
              )}
            >
              <Ship className="h-5 w-5" /> {navigation?.links?.houseboats || 'Houseboats'}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/river-cruise"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
                pathname === '/river-cruise' ? 'bg-brand-ink text-white' : 'text-gray-700 hover:bg-white'
              )}
            >
              <Waves className="h-5 w-5" /> {navigation?.links?.riverCruise || 'River Cruise'}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/restaurant"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
                pathname === '/restaurant' ? 'bg-brand-ink text-white' : 'text-gray-700 hover:bg-white'
              )}
            >
              <Utensils className="h-5 w-5" /> {navigation?.links?.restaurant || 'Restaurant'}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/contact"
              className={cn(
                'mt-2 flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white',
                'cta-shimmer'
              )}
              aria-current={pathname === '/contact' ? 'page' : undefined}
            >
              <Mail className="h-4 w-4" /> {navigation?.links?.contact || 'Contact Us'}
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
