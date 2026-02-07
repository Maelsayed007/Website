'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  Settings,
  LogOut,
  Bell,
  MessageSquare,
  Utensils,
  Ship,
  PanelLeft,
  LayoutGrid,
  Globe,
  LayoutDashboard,
  Trash2,
  X,
  UserCog,
  History,
  PlusCircle,
  Clock,
  Printer,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from './logo';
import { Button } from './ui/button';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuFooter,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState, useMemo, useEffect } from 'react';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { Badge } from './ui/badge';
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
  canEditHouseboatReservations?: boolean;
  canEditRestaurantReservations?: boolean;
  canEditDailyTravelReservations?: boolean;
  canEditClients?: boolean;
}

type UserProfile = {
  id: string;
  username: string;
  email: string;
  permissions: Permissions;
};

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, exact: true, permission: 'canViewDashboard' as keyof Permissions },
  { href: '/dashboard/houseboat-reservations', label: 'Houseboats', icon: Ship, permission: 'canViewHouseboatReservations' as keyof Permissions },
  { href: '/dashboard/restaurant-reservations', label: 'Restaurant', icon: Utensils, permission: 'canViewRestaurantReservations' as keyof Permissions },
  { href: '/dashboard/daily-travel-reservations', label: 'Daily Travel', icon: Calendar, permission: 'canViewDailyTravelReservations' as keyof Permissions },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, permission: 'canViewClients' as keyof Permissions },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, permission: 'canViewMessages' as keyof Permissions },
  { href: '/dashboard/activity-log', label: 'Activity Log', icon: History, permission: 'canManageStaff' as keyof Permissions },
  { href: '/dashboard/printables', label: 'Printables', icon: Printer, permission: 'canViewDashboard' as keyof Permissions },
];

type Booking = {
  id: string;
  client_name: string;
  start_time: string;
  status: 'Pending' | 'Confirmed' | 'Maintenance';
  read?: boolean;
  houseboat_id?: string;
  restaurant_table_id?: string;
  daily_travel_package_id?: string;
};

const getBookingType = (booking: Booking) => {
  if (booking.houseboat_id) return { icon: Ship, path: `/dashboard/houseboat-reservations?highlight=${booking.id}` };
  if (booking.restaurant_table_id) return { icon: Utensils, path: '/dashboard/restaurant-reservations' };
  if (booking.daily_travel_package_id) return { icon: Calendar, path: '/dashboard/daily-travel-reservations' };
  return { icon: MessageSquare, path: '/dashboard/messages' };
}

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase, user } = useSupabase();

  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [openCommand, setOpenCommand] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenCommand((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpenCommand(false);
    command();
  }

  // Fetch User Profile
  useEffect(() => {
    if (!supabase || !user) return;

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setUserProfile(data as UserProfile);
      setIsLoadingProfile(false);
    };

    fetchProfile();
  }, [supabase, user]);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const isSuperAdmin = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin;
  const canAccessSettings = isSuperAdmin || userProfile?.permissions?.canAccessSettings;

  const unreadCount = notifications?.filter(n => !n.read && n.status === 'Pending').length || 0;

  // Real-time Notifications
  useEffect(() => {
    if (!supabase) return;

    // Initial fetch
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'Pending')
        .order('start_time', { ascending: false })
        .limit(20);

      if (data) setNotifications(data as Booking[]);
    };

    fetchNotifications();

    // Subscribe to changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          fetchNotifications(); // Refresh on any change for simplicity
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);


  const handleLogout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDismissNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!supabase) return;
    await supabase.from('bookings').update({ read: true }).eq('id', notificationId);
  }

  const handleNotificationClick = async (notification: Booking) => {
    if (!supabase) return;

    await supabase.from('bookings').update({ read: true }).eq('id', notification.id);

    const { path } = getBookingType(notification);
    router.push(path);
  };

  const handleMarkAllRead = async () => {
    if (!supabase || notifications.length === 0) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('bookings').update({ read: true }).in('id', unreadIds);
    }
  }

  const visibleNavLinks = useMemo(() => {
    if (isSuperAdmin) return navLinks;
    if (!userProfile?.permissions) return [];

    return navLinks.filter(link => userProfile.permissions[link.permission as keyof Permissions]);
  }, [userProfile, isSuperAdmin]);


  return (
    <>
      <header className={cn(
        "sticky top-0 z-40 flex h-20 items-center transition-all duration-300",
        isScrolled ? "h-16" : "h-20"
      )}>
        <div className={cn(
          "flex items-center justify-between transition-all duration-300 w-full",
          isScrolled
            ? "container mx-auto max-w-screen-xl rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur-xl"
            : "container mx-auto px-4"
        )}>

          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-lg font-semibold mb-4"
                  >
                    <Logo className="h-7 w-7 text-primary" />
                    <span className="font-bold text-lg">Amieira</span>
                  </Link>
                  {visibleNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                        pathname.startsWith(link.href) ? 'bg-muted text-foreground' : ''
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
              <Logo className="h-7 w-7 text-primary" />
              <span className="font-bold text-lg hidden sm:inline-block">Amieira</span>
            </Link>
          </div>

          <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-1 md:text-base lg:gap-2">
            {visibleNavLinks.map((link) => {
              const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-foreground h-9 flex items-center px-4 rounded-full",
                    isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="outline" className="h-9 w-9 p-0 justify-start text-sm text-muted-foreground md:h-10 md:w-40 lg:w-64 md:p-2" onClick={() => setOpenCommand(true)}>
              <Search className="h-4 w-4 md:mr-2" />
              <span className="hidden lg:inline-flex">Search actions...</span>
              <span className="hidden md:inline-flex lg:hidden">Search...</span>
              <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-xs font-bold text-primary-foreground flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Toggle notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel>New Pending Bookings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                  {notifications && notifications.length > 0 ? (
                    notifications.map(notif => {
                      const { icon: Icon } = getBookingType(notif);
                      const isExpired = differenceInHours(new Date(), new Date(notif.start_time)) > 48;
                      return (
                        <DropdownMenuItem key={notif.id} onSelect={() => handleNotificationClick(notif)} className={cn("flex gap-3 pr-8", !notif.read && 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50')}>
                          <div className="relative">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            {!notif.read && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{notif.client_name}</p>
                              {isExpired && <Badge variant="destructive" className="px-1 py-0 text-[10px]">Expired</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.start_time), { addSuffix: true })}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full"
                            onClick={(e) => handleDismissNotification(e, notif.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </DropdownMenuItem>
                      )
                    })
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">No new notifications</div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuFooter className="p-1">
                      <Button variant="ghost" size="sm" className="w-full" onClick={handleMarkAllRead}>
                        <Trash2 className="mr-2 h-4 w-4" /> Dismiss All
                      </Button>
                    </DropdownMenuFooter>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {canAccessSettings && <Button variant="ghost" size="icon" className="rounded-full" asChild>
              <Link href="/dashboard/settings"><Settings className="h-5 w-5" /></Link>
            </Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {user?.user_metadata?.avatar_url ? (
                      <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name || 'User'} />
                    ) : (
                      <AvatarFallback>{userProfile?.username?.[0].toUpperCase() || 'A'}</AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{isHardcodedAdmin ? 'Site Administrator' : userProfile?.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/')}>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>View Website</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {visibleNavLinks.map(link => (
              <CommandItem
                key={link.href}
                onSelect={() => runCommand(() => router.push(link.href))}
              >
                <link.icon className="mr-2 h-4 w-4" />
                <span>{link.label}</span>
              </CommandItem>
            ))}
            {canAccessSettings && (
              <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </CommandItem>
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/clients?action=new'))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Client</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/houseboat-reservations?action=new'))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Houseboat Booking</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/restaurant-reservations?action=new'))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>New Restaurant Reservation</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
