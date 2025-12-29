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
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      if (!isUserLoading && !user) setIsLoadingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data as { permissions: UserPermissions });
      }
      setIsLoadingProfile(false);
    };
    fetchProfile();
  }, [supabase, user, isUserLoading]);

  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';
  const hasSettingsAccess = isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin || userProfile?.permissions?.canAccessSettings;
  const isLoading = isUserLoading || isLoadingProfile;

  const visibleNavLinks = useMemo(() => {
    if (isHardcodedAdmin || userProfile?.permissions?.isSuperAdmin) {
      return settingsNavLinks;
    }
    if (!userProfile?.permissions) return [];

    return settingsNavLinks.filter(link =>
      userProfile.permissions[link.permission as keyof UserPermissions]
    );
  }, [userProfile, isHardcodedAdmin]);


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

