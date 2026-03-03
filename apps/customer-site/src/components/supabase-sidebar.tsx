'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from './providers/supabase-provider';

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  permission: string;
};

type SupabaseSidebarProps = {
  visibleLinks: NavLink[];
  canAccessSettings: boolean;
  userProfile?: { username?: string; email?: string } | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export const DASHBOARD_SIDEBAR_EXPANDED_WIDTH = 272;
export const DASHBOARD_SIDEBAR_COLLAPSED_WIDTH = 72;
export const DASHBOARD_SIDEBAR_WIDTH = DASHBOARD_SIDEBAR_EXPANDED_WIDTH;

export default function SupabaseSidebar({
  visibleLinks,
  canAccessSettings,
  userProfile,
  isCollapsed = false,
  onToggleCollapse,
}: SupabaseSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const initials = useMemo(() => {
    const source = userProfile?.username || userProfile?.email || 'U';
    return source.slice(0, 1).toUpperCase();
  }, [userProfile?.email, userProfile?.username]);

  const topLinks = visibleLinks.filter((link) => !link.href.startsWith('/dashboard/settings'));
  const recentLinks = topLinks.slice(0, 5);
  const operationLinks = topLinks.slice(5);

  const isLinkActive = (link: NavLink) => {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 border-r transition-[width] duration-200"
      style={{
        width: isCollapsed ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH : DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
        borderColor: 'rgba(255,255,255,0.07)',
        background:
          'linear-gradient(180deg, #171717 0%, #141414 42%, #121212 100%)',
      }}
    >
      <div className="flex h-full flex-col">
        <div className={cn('pb-3 pt-4', isCollapsed ? 'px-2' : 'px-3')}>
          <div className={cn('flex items-center rounded-md py-1.5', isCollapsed ? 'justify-center px-0' : 'gap-2 px-2')}>
            <Avatar className="h-7 w-7 rounded-md border border-white/10">
              <AvatarImage src={`https://avatar.vercel.sh/${userProfile?.email || 'user'}`} />
              <AvatarFallback className="rounded-md bg-zinc-700 text-[13px] font-semibold text-zinc-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.02rem] font-semibold text-zinc-100">
                  {userProfile?.username || userProfile?.email?.split('@')[0] || 'Staff'}
                </p>
              </div>
            ) : null}
          </div>
          <div className={cn('mt-2 flex', isCollapsed ? 'justify-center' : 'justify-end')}>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-100"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav className={cn('no-scrollbar flex-1 space-y-1 overflow-y-auto pb-4', isCollapsed ? 'px-2' : 'px-3')}>
          {recentLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isLinkActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  'relative flex h-10 items-center rounded-md transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-2 px-2 text-sm font-medium',
                  isActive
                    ? 'bg-white/14 text-zinc-100 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[2px] before:rounded-r before:bg-zinc-100'
                    : 'text-zinc-300 hover:bg-white/6 hover:text-zinc-100'
                )}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                {!isCollapsed ? <span className="truncate">{link.label}</span> : null}
              </Link>
            );
          })}

          {!isCollapsed ? (
            <div className="pt-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Operations
              </p>
            </div>
          ) : null}

          {operationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isLinkActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  'relative flex h-10 items-center rounded-md transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-2 px-2 text-sm font-medium',
                  isActive
                    ? 'bg-white/14 text-zinc-100 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[2px] before:rounded-r before:bg-zinc-100'
                    : 'text-zinc-300 hover:bg-white/6 hover:text-zinc-100'
                )}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                {!isCollapsed ? <span className="truncate">{link.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className={cn('space-y-1 border-t border-white/7 py-3', isCollapsed ? 'px-2' : 'px-3')}>
          {canAccessSettings ? (
            <Link
              href="/dashboard/settings"
              title="Settings"
              className={cn(
                'relative flex h-10 items-center rounded-md transition-colors',
                isCollapsed ? 'justify-center px-0' : 'gap-2 px-2 text-sm font-medium',
                pathname.startsWith('/dashboard/settings')
                  ? 'bg-white/14 text-zinc-100 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[2px] before:rounded-r before:bg-zinc-100'
                  : 'text-zinc-300 hover:bg-white/6 hover:text-zinc-100'
              )}
            >
              <Settings className="h-[17px] w-[17px] shrink-0" />
              {!isCollapsed ? <span>Settings</span> : null}
            </Link>
          ) : null}

          <button
            onClick={() => signOut()}
            title="Sign out"
            className={cn(
              'flex h-10 w-full items-center rounded-md text-zinc-300 transition-colors hover:bg-white/6 hover:text-zinc-100',
              isCollapsed ? 'justify-center px-0' : 'gap-2 px-2 text-sm font-medium'
            )}
          >
            <LogOut className="h-[17px] w-[17px] shrink-0" />
            {!isCollapsed ? <span>Sign out</span> : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
