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
}

export default function Header({ navigation, websiteSettings, activeTab = 'houseboats', onTabChange }: HeaderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useSupabase();

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

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-white shadow-sm border-b border-gray-200'
          : 'bg-white border-b border-gray-100'
      )}
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center h-16 gap-10 relative">

          {/* Logo Section - BIGGER */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {websiteSettings?.logoUrl ? (
              <Image
                src={websiteSettings.logoUrl}
                alt={websiteSettings?.companyName || 'Logo'}
                width={180}
                height={60}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-semibold text-gray-700">
                {websiteSettings?.companyName || 'Amieira'}
              </span>
            )}
          </Link>

          {/* Main Tabs - Google Style: Centered Absolute */}
          <nav className="hidden lg:flex items-center gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {mainTabs.map(tab => {
              const isActive = activeTab === tab.id;
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 border',
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600' // Filled emerald for selected
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50' // Outline for others
                  )}
                >
                  <IconComponent className={cn(
                    'h-4 w-4',
                    isActive ? 'text-white' : 'text-gray-500'
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Spacer - Removed since we are using flex with justify-between logic implicitly by spacing items */}
          <div className="flex-1 lg:hidden" /> {/* Keep spacer only for mobile to push menu right if needed, but flex-1 works generally */}
          <div className="hidden lg:block flex-1"></div> {/* Push right side auth to right */}

          {/* Right Side - Auth & Mobile Menu */}
          <div className="flex items-center gap-2">

            {/* Auth Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {!user ? (
                <Button asChild variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 rounded-full">
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 rounded-full">
                    <Link href="/dashboard">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-gray-600 hover:bg-gray-100 rounded-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
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
                              ? 'bg-emerald-600 text-white'
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
                  {!user ? (
                    <SheetClose asChild>
                      <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-lg">
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
                  )}
                </nav>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </div>
    </header>
  );
}
