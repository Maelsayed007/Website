'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogIn, User, LogOut, Ship, Waves, UtensilsCrossed, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetClose, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/components/providers/supabase-provider';
import Cookies from 'js-cookie';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickLoginForm } from '@/components/quick-login-form';
import { LayoutGrid, Settings, ShieldCheck, UserCircle } from 'lucide-react';

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
  const router = useRouter();
  const isHomePage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { supabase, user, signOut } = useSupabase();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (!supabase || !user) {
      setUserProfile(null);
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [supabase, user]);

  const isStaff = userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canViewDashboard || user?.email === 'myasserofficial@gmail.com';

  const currentLocale = (mounted && Cookies.get('NEXT_LOCALE')) || 'en';

  const handleLanguageChange = (val: string) => {
    Cookies.set('NEXT_LOCALE', val, { expires: 365 });
    router.refresh();
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
        'z-40 w-[95%] max-w-6xl transition-all duration-300',
        (isFixed && isScrolled)
          ? 'fixed top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-full shadow-[0_0_50px_5px_rgba(0,0,0,0.2)]'
          : 'absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-[0_0_50px_5px_rgba(0,0,0,0.2)]'
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
                <span className="text-2xl font-semibold text-[#18230F]">
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
                    'px-4 py-1 rounded-xl text-base font-semibold transition-all duration-300 flex items-center gap-2 border whitespace-nowrap outline-none',
                    isActive
                      ? 'bg-[#34C759] text-[#18230F] border-[#34C759] hover:bg-[#2DA64D] hover:border-[#2DA64D] shadow-sm'
                      : 'bg-white text-[#18230F] border-gray-100 hover:bg-[#34C759]/10 hover:border-[#34C759]/20 hover:text-[#2DA64D]'
                  )}
                >
                  <IconComponent className={cn(
                    'h-4 w-4',
                    isActive ? 'text-[#18230F]' : 'text-[#18230F]'
                  )} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side - Account & Language */}
          <div className="flex items-center gap-4 flex-shrink-0 min-w-[140px] justify-end">

            {/* Account Flow */}
            <div className="flex items-center">
              {!user ? (
                /* GUEST: Quick Login Popover */
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-gray-100 text-[#18230F] hover:bg-[#34C759]/10 hover:text-[#2DA64D] transition-all">
                      <User className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent sideOffset={32} className="w-[300px] p-0 border-none shadow-2xl rounded-xl overflow-hidden z-[1001]" align="end">
                    <div className="bg-white p-3">
                      <QuickLoginForm />
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                /* AUTH: Account Dropdown */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gray-100 text-[#18230F] hover:bg-[#34C759]/10 hover:text-[#2DA64D] transition-all">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={32} align="end" className="w-48 rounded-lg p-1 shadow-2xl border-none z-[1001]">
                    {!isStaff ? (
                      <DropdownMenuItem asChild className="rounded-lg focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer py-2 px-3 font-headline font-bold text-base text-slate-800">
                        <Link href="/my-bookings" className="flex items-center w-full">
                          <User className="mr-2.5 h-4.5 w-4.5" /> My Bookings
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild className="rounded-lg focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer py-2 px-3 font-headline font-bold text-base text-slate-800">
                        <Link href="/dashboard" className="flex items-center w-full">
                          <LayoutGrid className="mr-2.5 h-4.5 w-4.5" /> Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="rounded-lg focus:bg-red-50 focus:text-red-600 cursor-pointer py-2 px-3 font-headline font-bold text-base text-slate-800"
                    >
                      <LogOut className="mr-2.5 h-4.5 w-4.5 text-red-500" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Visual Divider */}
            <div className="h-6 w-px bg-slate-100" />

            {/* Language Switcher - Far Right */}
            <div className="flex items-center">
              <Select defaultValue={currentLocale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[50px] h-10 border-none bg-transparent hover:bg-gray-50 rounded-full focus:ring-0 focus:ring-offset-0 p-0 transition-all text-sm font-black text-slate-900 justify-center">
                  {currentLocale.charAt(0).toUpperCase() + currentLocale.slice(1)}
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[80px] rounded-lg shadow-xl border-none">
                  {['en', 'pt', 'ar', 'de', 'es', 'fr', 'it', 'nl'].map((lang) => (
                    <SelectItem key={lang} value={lang} className="rounded-xl focus:bg-emerald-50 font-bold">
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                              ? 'bg-[#34C759] text-[#18230F]'
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
                      <Button asChild className="w-full bg-[#34C759] text-[#18230F] hover:bg-[#2DA64D] rounded-lg">
                        <Link href="/login">
                          <LogIn className="h-4 w-4 mr-2" /> {navigation.auth.login}
                        </Link>
                      </Button>
                    </SheetClose>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link href="/my-bookings" className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-bold">
                          <User className="h-4 w-4" /> My Bookings
                        </Link>
                      </SheetClose>
                      {isStaff && (
                        <SheetClose asChild>
                          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold">
                            <LayoutGrid className="h-4 w-4" /> Dashboard
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
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
