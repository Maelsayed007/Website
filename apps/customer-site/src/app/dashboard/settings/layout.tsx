'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Globe,
  Ship,
  Utensils,
  Calendar,
  FileText,
  UserCog,
  DollarSign,
  Puzzle,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  canAccessSettings as canAccessSettingsFromPermissions,
  isSuperAdmin as isSuperAdminFromPermissions,
} from '@/lib/auth/permissions';

const settingsNavLinks = [
  { href: '/dashboard/settings/general', label: 'General', icon: Globe, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/houseboats', label: 'Houseboats', icon: Ship, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/tariffs', label: 'Tariffs', icon: DollarSign, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/river-cruise', label: 'River Cruise', icon: Calendar, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/restaurant', label: 'Restaurant', icon: Utensils, permission: 'canAccessSettings' },
  { href: '/dashboard/settings/extras', label: 'Extras', icon: Puzzle, permission: 'canAccessSettings' },
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
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      } catch (error) {
        console.error('Failed to fetch admin session:', error);
      } finally {
        setIsAdminLoading(false);
      }
    };
    fetchAdminSession();
  }, []);

  const isSuperAdmin = isSuperAdminFromPermissions(userProfile, adminUser);
  const hasSettingsAccess = canAccessSettingsFromPermissions(userProfile, adminUser);

  const visibleNavLinks = useMemo(() => {
    if (isSuperAdmin) return settingsNavLinks;
    if (!userProfile?.permissions) return [];

    return settingsNavLinks.filter((link) => {
      const permKey = link.permission as keyof UserPermissions;
      if (link.permission === 'canAccessSettings') {
        return userProfile.permissions.canViewSettings || userProfile.permissions.canAccessSettings;
      }
      return userProfile.permissions[permKey];
    });
  }, [isSuperAdmin, userProfile]);

  if (isAdminLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        You do not have permission to view these settings.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="sticky top-[56px] z-10 rounded-xl border border-border bg-card px-2 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors',
                pathname.startsWith(link.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

