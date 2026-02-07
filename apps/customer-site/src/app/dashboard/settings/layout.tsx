'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Ship, DollarSign, Calendar, Utensils, Puzzle, Globe, Star, FileText, UserCog, History, Ticket } from 'lucide-react';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const settingsNavLinks = [
  { href: '/dashboard/settings/general', label: 'General', icon: Globe, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/houseboats', label: 'Houseboats', icon: Ship, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/tariffs', label: 'Tariffs', icon: DollarSign, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/daily-travel', label: 'Daily Travel', icon: Calendar, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/restaurant', label: 'Restaurant', icon: Utensils, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/extras', label: 'Extras', icon: Puzzle, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/vouchers', label: 'Vouchers', icon: Ticket, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/testimonials', label: 'Testimonials', icon: Star, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/documents', label: 'Documents', icon: FileText, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/staff', label: 'Staff', icon: UserCog, permission: 'canManageStaff' },
];

type UserPermissions = {
  isSuperAdmin?: boolean;
  canViewSettings?: boolean;
  canEditSettings?: boolean;
  canAccessSettings?: boolean;
  canManageStaff?: boolean;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useAuth();
  const { supabase } = useSupabase();
  const [userProfile, setUserProfile] = useState<{ permissions: UserPermissions } | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const fetchAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/auth/session');
        if (res.ok) {
          const data = await res.json();
          setAdminUser(data.user);
          if (data.user) {
            setUserProfile({ permissions: data.user.permissions });
          }
        }
      } catch (e) {
        console.error('Failed to fetch admin session:', e);
      } finally {
        setIsAdminLoading(false);
      }
    };
    fetchAdminSession();
  }, []);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const isSuperAdmin = isHardcodedAdmin || adminUser?.role === 'super_admin' || userProfile?.permissions?.isSuperAdmin;
  const hasSettingsAccess = isSuperAdmin || userProfile?.permissions?.canViewSettings || userProfile?.permissions?.canAccessSettings;
  const isLoading = isUserLoading && isAdminLoading;

  const visibleNavLinks = useMemo(() => {
    if (isSuperAdmin) {
      return settingsNavLinks;
    }
    if (!userProfile?.permissions) return [];

    return settingsNavLinks.filter(link => {
      const permKey = link.permission as keyof UserPermissions;
      // Map specific nav requirements to available permissions if needed
      if (link.permission === 'canAccessSettings') return userProfile.permissions.canViewSettings || userProfile.permissions.canAccessSettings;
      return userProfile.permissions[permKey];
    });
  }, [userProfile, isSuperAdmin]);


  if (isLoading) {
    return (
      <div className="flex gap-6">
        <nav className="w-[220px] lg:w-[280px] flex-shrink-0">
          <div className="space-y-2">
            {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        </nav>
        <div className="flex-grow">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        You do not have permission to view these settings.
      </div>
    );
  }


  return (
    <div className="flex gap-8">
      <nav className="w-48 flex-shrink-0">
        <div className="sticky top-24 space-y-0.5 bg-card rounded-xl p-2 border border-border">
          {visibleNavLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors font-semibold',
                pathname.startsWith(link.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="flex-grow min-w-0">{children}</div>
    </div>
  );
}

