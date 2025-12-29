'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, LogOut, LogIn } from 'lucide-react';

import Logo from './logo';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

type WebsiteSettings = {
  companyName?: string;
  logoUrl?: string;
};

type HeaderProps = {
  navigation: any;
};

export default function Header({ navigation }: HeaderProps) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, signOut } = useAuth();
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const [isStaff, setIsStaff] = useState(false);
  const [isCheckingStaff, setIsCheckingStaff] = useState(true);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);

  const isHomePage = pathname === '/';

  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user || !supabase) {
        setIsStaff(false);
        setIsCheckingStaff(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('permissions')
          .eq('id', user.id)
          .single();

        // Check if user has dashboard access - NOT just profile existence
        const hasDashboardAccess =
          user.email === 'myasserofficial@gmail.com' ||
          data?.permissions?.isSuperAdmin ||
          data?.permissions?.canViewDashboard;

        setIsStaff(!!hasDashboardAccess);
      } catch (error) {
        console.error('Error checking staff status:', error);
        setIsStaff(false);
      } finally {
        setIsCheckingStaff(false);
      }
    };

    checkStaffStatus();
  }, [user, supabase]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'main')
        .single();

      if (data && data.data) {
        setWebsiteSettings(data.data as WebsiteSettings);
      }
    };

    fetchSettings();
  }, [supabase]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    toast({ title: 'Signed out successfully' });
  };

  const navLinks = [
    { href: '/houseboats', label: navigation.links.houseboats },
    { href: '/daily-travel', label: navigation.links.dailyTravel },
    { href: '/restaurant', label: navigation.links.restaurant },
    { href: '/gallery', label: 'Gallery' },
    { href: '/contact', label: 'Contact' },
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
        'fixed top-0 z-50 w-full transition-all duration-300 border-b border-transparent',
        isScrolled
          ? 'bg-[#010a1f] shadow-sm py-2' // Compact Scrolled State
          : isHomePage
            ? 'bg-transparent py-3'        // Compact Transparent Home State
            : 'bg-[#010a1f] py-2'          // Compact Default State
      )}
    >
      <div className="container mx-auto max-w-7xl px-4">
        {/* Slightly reduced height from h-14 to h-10/11 */}
        <div className="flex items-center justify-between h-10">

          {/* Logo Section */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 hover:opacity-90 transition-all duration-200 group min-w-[120px]"
          >
            <div className="relative h-9 w-auto flex items-center">
              <Logo
                logoUrl={websiteSettings?.logoUrl}
                companyName={websiteSettings?.companyName}
                className="text-white scale-90 origin-left" // Scale down logic
                isWhite={!isScrolled}
              />
            </div>
          </Link>

          {/* Navigation - Desktop - Smaller Text */}
          <nav className="hidden lg:flex items-center gap-1 justify-center flex-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 rounded-lg group',
                    isActive
                      ? 'text-green-400'
                      : 'text-white/90 hover:text-green-400'
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-green-500 transition-all duration-200',
                      isActive ? 'w-4' : 'w-0 group-hover:w-3'
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Auth buttons & Mobile Menu - Compact */}
          <div className="flex items-center gap-2 justify-end min-w-[120px]">
            {isUserLoading || isCheckingStaff ? (
              <Skeleton className="h-8 w-20 rounded-md bg-white/20" />
            ) : !user ? (
              <Button asChild size="sm" className="h-8 rounded-md bg-green-600 hover:bg-green-700 shadow-sm text-white border-none text-xs font-bold px-4">
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 rounded-md font-semibold border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent text-xs">
                  <Link href={isStaff ? "/dashboard" : "/my-bookings"}>
                    {isStaff ? 'Dashboard' : 'Bookings'}
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-md h-8 w-8 text-white hover:bg-white/10 hover:text-red-400">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-md h-8 w-8 text-white hover:bg-white/10">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white">
                  {/* Mobile Menu Header */}
                  <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                    <div className="h-8">
                      <Logo
                        logoUrl={websiteSettings?.logoUrl}
                        companyName={websiteSettings?.companyName}
                        className="text-black scale-90 origin-left"
                        isWhite={false}
                      />
                    </div>
                  </div>

                  {/* Mobile Nav Links */}
                  <nav className="flex flex-col gap-2">
                    {navLinks.map(link => {
                      const isActive = pathname === link.href;
                      return (
                        <SheetClose key={link.href} asChild>
                          <Link
                            href={link.href}
                            className={cn(
                              'px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors',
                              isActive
                                ? 'text-green-600 bg-green-50'
                                : 'text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>

                  {/* Mobile Auth */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    {!user ? (
                      <SheetClose asChild>
                        <Button asChild className="w-full h-10 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-bold">
                          <Link href="/login">
                            <LogIn className="h-4 w-4 mr-2" /> Sign In
                          </Link>
                        </Button>
                      </SheetClose>
                    ) : (
                      <div className="space-y-3">
                        <SheetClose asChild>
                          <Button asChild variant="outline" className="w-full h-10 rounded-lg text-sm font-bold">
                            <Link href={isStaff ? "/dashboard" : "/my-bookings"}>
                              {isStaff ? 'Dashboard' : 'My Bookings'}
                            </Link>
                          </Button>
                        </SheetClose>
                        <Button
                          variant="ghost"
                          onClick={handleSignOut}
                          className="w-full h-10 rounded-lg text-red-600 hover:bg-red-50 text-sm font-bold"
                        >
                          <LogOut className="h-4 w-4 mr-2" /> Sign Out
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
