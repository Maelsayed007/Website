'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, LogIn, User, LogOut, Ship, Waves, UtensilsCrossed, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetClose, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/components/providers/supabase-provider';

interface HeaderProps {
  navigation: {
    links: {
      houseboats: string;
      dailyTravel: string;
      restaurant: string;
    };
    auth: {
      login: string;
      register: string;
      logout: string;
      dashboard: string;
    };
  };
  websiteSettings?: {
    logoUrl?: string;
    companyName?: string;
  } | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isFixed?: boolean;
}

export default function Header({
  navigation,
  websiteSettings,
  activeTab = 'houseboats',
  onTabChange,
  isFixed = true
}: HeaderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, signOut } = useSupabase();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // All 4 tabs - styled like Google (filled pill for selected)
  const mainTabs = [
    { id: 'houseboats', label: 'Houseboats', icon: Ship },
    { id: 'river-cruise', label: 'River Cruise', icon: Waves },
    { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
    { id: 'contact', label: 'Contact', icon: Mail },
  ];

  // Scroll detection - only relevant if fixed
  useEffect(() => {
    if (!isFixed) return;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFixed]);

  return (
    <header
      className={cn(
        'z-[9999] w-[95%] max-w-6xl transition-all duration-300',
        (isFixed && isScrolled)
          ? 'fixed top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-md'
          : 'absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-md'
      )}
    >
      <div className="mx-auto px-8 w-full">
        <div className="flex items-center justify-between h-[72px] relative">

          {/* Logo Section */}
          <div className="flex-shrink-0 min-w-[140px]">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {websiteSettings?.logoUrl ? (
                <Image
                  src={websiteSettings.logoUrl}
                  alt={websiteSettings?.companyName || 'Logo'}
                  width={180}
                  height={60}
                  className="h-14 w-auto object-contain"
                />
              ) : (
                <span className="text-2xl font-semibold text-black">
                  {websiteSettings?.companyName || 'Amieira'}
                </span>
              )}
            </Link>
          </div>

          {/* Main Tabs */}
          <nav className="hidden lg:flex items-center gap-2 px-2">
            {mainTabs.map(tab => {
              const isActive = activeTab === tab.id;
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 border whitespace-nowrap',
                    isActive
                      ? 'bg-[#34C759] text-black border-[#34C759]'
                      : 'bg-white text-black border-gray-100 hover:bg-gray-50'
                  )}
                >
                  <IconComponent className={cn(
                    'h-5 w-5',
                    isActive ? 'text-black' : 'text-black'
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side - Auth & Mobile Menu */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px] justify-end">

            {/* Auth Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {mounted && !user ? (
                <Button asChild variant="ghost" size="sm" className="bg-gray-100 text-black hover:bg-gray-200 rounded-full h-10 px-5 text-sm font-medium transition-all border-none shadow-none">
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in
                  </Link>
                </Button>
              ) : mounted && user ? (
                <>
                  <Button asChild variant="ghost" size="icon" className="bg-gray-100 text-black hover:bg-gray-200 rounded-full h-10 w-10 transition-all border-none shadow-none">
                    <Link href="/dashboard" title="Dashboard">
                      <User className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="bg-gray-100 text-black hover:bg-gray-200 rounded-full h-10 px-5 text-sm font-medium transition-all border-none shadow-none"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <div className="h-10 w-20" />
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-700">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white p-0">
                <SheetHeader className="p-6 border-b border-gray-100">
                  <SheetTitle className="text-left">
                    {websiteSettings?.companyName || 'Menu'}
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4 flex flex-col gap-1">
                  {/* Mobile Tabs */}
                  {isHomePage && mainTabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const IconComponent = tab.icon;
                    return (
                      <SheetClose asChild key={tab.id}>
                        <button
                          onClick={() => onTabChange?.(tab.id)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
                            isActive
                              ? 'bg-[#34C759] text-black'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          <IconComponent className="h-5 w-5" />
                          {tab.label}
                        </button>
                      </SheetClose>
                    );
                  })}
                  <div className="my-4 border-t border-gray-100" />
                  {mounted && (!user ? (
                    <SheetClose asChild>
                      <Button asChild className="w-full bg-[#34C759] text-black hover:bg-[#2DA64D] rounded-lg">
                        <Link href="/login">
                          <LogIn className="h-4 w-4 mr-2" /> Sign In
                        </Link>
                      </Button>
                    </SheetClose>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                          <User className="h-4 w-4" /> Dashboard
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </SheetClose>
                    </>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </div>
    </header>
  );
}
