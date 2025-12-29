'use client';

import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import SupabaseSidebar from '@/components/supabase-sidebar';
import DashboardTopBar from '@/components/dashboard-topbar';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Users,
  MessageSquare,
  Utensils,
  Ship,
  LayoutGrid,
  History,
  Printer,
  PlusCircle,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

type Permissions = {
  isSuperAdmin?: boolean;
  canViewDashboard?: boolean;
  canViewHouseboatReservations?: boolean;
  canViewRestaurantReservations?: boolean;
  canViewDailyTravelReservations?: boolean;
  canViewClients?: boolean;
  canViewMessages?: boolean;
  canAccessSettings?: boolean;
  canManageStaff?: boolean;
};

type UserProfile = {
  id: string;
  username: string;
  email: string;
  permissions: Permissions;
};

type Booking = {
  id: string;
  clientName: string;
  start_time: string; // Supabase uses snake_case and ISO string
  status: 'Pending' | 'Confirmed' | 'Maintenance';
  read?: boolean;
};

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, exact: true, permission: 'canViewDashboard' as keyof Permissions },
  { href: '/dashboard/reservations', label: 'Reservations', icon: Calendar, permission: 'canViewDashboard' as keyof Permissions },
  { href: '/dashboard/houseboat-reservations', label: 'Houseboats', icon: Ship, permission: 'canViewHouseboatReservations' as keyof Permissions },
  { href: '/dashboard/restaurant-reservations', label: 'Restaurant', icon: Utensils, permission: 'canViewRestaurantReservations' as keyof Permissions },
  { href: '/dashboard/daily-travel-reservations', label: 'Daily Travel', icon: History, permission: 'canViewDailyTravelReservations' as keyof Permissions },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, permission: 'canViewClients' as keyof Permissions },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, permission: 'canViewMessages' as keyof Permissions },
  { href: '/dashboard/printables', label: 'Printables', icon: Printer, permission: 'canViewDashboard' as keyof Permissions },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHouseboatReservations = pathname === '/dashboard/houseboat-reservations';

  const { user, isUserLoading } = useAuth();
  const { supabase } = useSupabase();
  const router = useRouter();
  const [openCommand, setOpenCommand] = useState(false);
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Fetch user profile
  useEffect(() => {
    if (!supabase || !user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, [supabase, user]);

  // Check permissions
  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const isSuperAdmin = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin;
  const canAccessSettings = isSuperAdmin || userProfile?.permissions?.canAccessSettings;

  // Filter visible navigation links based on permissions
  const visibleNavLinks = useMemo(() => {
    if (isSuperAdmin) return navLinks;
    if (!userProfile?.permissions) return [];
    return navLinks.filter(link => userProfile.permissions[link.permission]);
  }, [userProfile, isSuperAdmin]);

  // Fetch notifications (Pending bookings)
  useEffect(() => {
    if (!supabase) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'Pending')
        .order('start_time', { ascending: false })
        .limit(20);

      if (data) {
        // Map Supabase fields if necessary, though type alias helps
        setNotifications(data as Booking[]);
      }
    };

    fetchNotifications();

    // subscriptions could be added here for realtime updates
  }, [supabase]);

  const unreadCount = notifications?.filter(n => !n.read && n.status === 'Pending').length || 0;

  // Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Loading state
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground">
        <div className="w-16 border-r border-border bg-sidebar-bg flex flex-col items-center py-4 gap-4">
          {/* Skeleton Rail */}
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="w-8 h-px bg-border" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-10 rounded-md" />)}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-dashboard className="bg-background min-h-screen">
      {/* Sidebar - Fixed to viewport */}
      <SupabaseSidebar
        visibleLinks={visibleNavLinks}
        canAccessSettings={!!canAccessSettings}
        userProfile={userProfile}
        hideLogo={isHouseboatReservations}
      />

      {/* Main Content Area */}
      <div
        className="ml-16 transition-all duration-300 relative min-h-screen"
        style={{ overflowX: 'hidden' }}
      >
        <DashboardTopBar
          canAccessSettings={!!canAccessSettings}
          userProfile={userProfile}
          onSearchClick={() => setOpenCommand(true)}
        />

        <main className={cn(
          "animate-fade-in-up",
          "p-4 md:p-6 lg:p-8"
        )}>
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {visibleNavLinks.map(link => (
              <CommandItem
                key={link.href}
                onSelect={() => {
                  setOpenCommand(false);
                  router.push(link.href);
                }}
              >
                <link.icon className="mr-2 h-4 w-4" />
                <span>{link.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => {
              setOpenCommand(false);
              router.push('/dashboard/clients?action=new');
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Client</span>
            </CommandItem>
            <CommandItem onSelect={() => {
              setOpenCommand(false);
              router.push('/dashboard/houseboat-reservations?action=new');
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Houseboat Booking</span>
            </CommandItem>
            <CommandItem onSelect={() => {
              setOpenCommand(false);
              router.push('/dashboard/restaurant-reservations?action=new');
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Restaurant Reservation</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
