
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Settings,
  MessageSquare,
  Utensils,
  Ship,
  LayoutGrid,
  History,
  Printer,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from './logo';
import { Button } from './ui/button';

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  permission: string;
};

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, exact: true, permission: 'canViewDashboard' },
  { href: '/dashboard/houseboat-reservations', label: 'Houseboats', icon: Ship, permission: 'canViewHouseboatReservations' },
  { href: '/dashboard/restaurant-reservations', label: 'Restaurant', icon: Utensils, permission: 'canViewRestaurantReservations' },
  { href: '/dashboard/daily-travel-reservations', label: 'Daily Travel', icon: Calendar, permission: 'canViewDailyTravelReservations' },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, permission: 'canViewClients' },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, permission: 'canViewMessages' },
  { href: '/dashboard/activity-log', label: 'Activity Log', icon: History, permission: 'canManageStaff' },
  { href: '/dashboard/printables', label: 'Printables', icon: Printer, permission: 'canViewDashboard' },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, permission: 'canManagePayments' },
];

type DashboardSidebarProps = {
  visibleLinks: NavLink[];
  canAccessSettings: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
};

export default function DashboardSidebar({
  visibleLinks,
  canAccessSettings,
  isCollapsed,
  onToggle
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'z-40 border-r border-border overflow-y-auto transition-all duration-300 ease-in-out shadow-sm',
        'bg-sidebar-bg dark:border-border/40 dark:shadow-lg',
        isCollapsed ? 'w-16' : 'w-60'
      )}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100vh'
      }}
    >
      {/* Logo & Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-primary" />
            <span className="text-base font-semibold text-foreground">Amieira</span>
          </Link>
        )}
        {isCollapsed && (
          <Logo className="h-7 w-7 text-primary mx-auto" />
        )}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:shadow-md transition-all"
        onClick={onToggle}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-0.5 p-3 mt-2">
        {visibleLinks.map((link) => {
          const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200 text-sm font-medium',
                isActive
                  ? 'bg-[#ECFDF5] text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-[#F3F4F6] hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Settings at Bottom */}
      {canAccessSettings && (
        <div className="absolute bottom-4 left-0 right-0 px-3">
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200 text-sm font-medium',
              pathname.startsWith('/dashboard/settings')
                ? 'bg-[#ECFDF5] text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-[#F3F4F6] hover:text-foreground',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings
              className={cn(
                'h-4 w-4 shrink-0',
                pathname.startsWith('/dashboard/settings') ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}
