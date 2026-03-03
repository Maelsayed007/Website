'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationProvider } from '@/components/providers/notification-provider';
import SupabaseSidebar, {
  DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
  DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from '@/components/supabase-sidebar';
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
import {
  canAccessSettings as canAccessSettingsFromPermissions,
  isSuperAdmin as isSuperAdminFromPermissions,
  type PermissionMap,
} from '@/lib/auth/permissions';
import type { DashboardNavItem } from '@/lib/dashboard/types';

type Permissions = PermissionMap;

type UserProfile = {
  id: string;
  username: string;
  email: string;
  permissions: Permissions;
};

const navLinks: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, exact: true, permission: 'canViewDashboard' },
  { href: '/dashboard/reservations', label: 'Reservations', icon: Calendar, permission: 'canViewDashboard' },
  { href: '/dashboard/houseboat-reservations', label: 'Houseboats', icon: Ship, permission: 'canViewHouseboatReservations' },
  { href: '/dashboard/restaurant-reservations', label: 'Restaurant', icon: Utensils, permission: 'canViewRestaurantReservations' },
  { href: '/dashboard/river-cruise-reservations', label: 'River Cruise', icon: History, permission: 'canViewRiverCruiseReservations' },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, permission: 'canViewClients' },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, permission: 'canViewMessages' },
  { href: '/dashboard/printables', label: 'Printables', icon: Printer, permission: 'canViewDashboard' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [openCommand, setOpenCommand] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Initialize admin session before rendering dashboard routes.
  useEffect(() => {
    const init = async () => {
      const adminData = await fetch('/api/admin/auth/session')
        .then(res => res.ok ? res.json() : null)
        .catch(() => null);

      // Handle admin session
      if (adminData?.user) {
        setAdminUser(adminData.user);
        setUserProfile({
          id: adminData.user.id,
          username: adminData.user.username,
          email: `${adminData.user.username}@staff.amieira.local`,
          permissions: adminData.user.permissions
        });
      } else {
        router.push('/staff-login');
      }

      setIsAdminLoading(false);
    };

    init();
  }, [router]);

  // Check permissions
  const isSuperAdmin = isSuperAdminFromPermissions(userProfile, adminUser);
  const canAccessSettings = canAccessSettingsFromPermissions(userProfile, adminUser);

  const visibleNavLinks = useMemo(() => {
    if (isSuperAdmin) return navLinks;
    if (!userProfile?.permissions) return [];
    return navLinks.filter(link => userProfile.permissions[link.permission]);
  }, [userProfile, isSuperAdmin]);

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

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem('dashboard:sidebar-collapsed');
      if (storedValue === '1') {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboard:sidebar-collapsed', next ? '1' : '0');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Loading state
  // Show skeleton only while we are determining if the user is an admin or a customer
  if (isAdminLoading) {
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
    <NotificationProvider>
      <div data-dashboard className="bg-background min-h-screen">
        <SupabaseSidebar
          visibleLinks={visibleNavLinks}
          canAccessSettings={!!canAccessSettings}
          userProfile={userProfile}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        <div
          className="relative min-h-screen"
          style={{
            overflowX: 'hidden',
            marginLeft: isSidebarCollapsed
              ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
              : DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
          }}
        >
          <DashboardTopBar
            canAccessSettings={!!canAccessSettings}
            userProfile={userProfile}
            onSearchClick={() => setOpenCommand(true)}
          />

          <main className={cn(
            'animate-fade-in-up',
            'p-4 md:p-6 lg:p-8'
          )}>
            {children}
          </main>
        </div>

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
    </NotificationProvider>
  );
}

