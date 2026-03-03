'use client';

import { Search, Settings, LogOut, Globe, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/supabase-provider';
import DashboardBreadcrumb from './dashboard-breadcrumb';
import { NotificationsDropdown } from './notifications-dropdown';
import { getRoleLabel, isSuperAdmin as isSuperAdminFromPermissions } from '@/lib/auth/permissions';

type DashboardTopBarProps = {
  canAccessSettings: boolean;
  userProfile: any;
  onSearchClick: () => void;
};

export default function DashboardTopBar({
  canAccessSettings,
  userProfile,
  onSearchClick,
}: DashboardTopBarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const isSuperAdmin = isSuperAdminFromPermissions(userProfile);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex-1">
          <DashboardBreadcrumb />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:w-auto md:px-3"
            onClick={onSearchClick}
          >
            <Search className="h-4 w-4" />
            <span className="ml-2 hidden md:inline-flex text-xs">Search</span>
            <kbd className="ml-2 hidden h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] md:inline-flex">
              Ctrl+K
            </kbd>
          </Button>

          <NotificationsDropdown />

          {canAccessSettings ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          ) : null}

          <ThemeToggle />
          <div className="h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 gap-2 px-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {userProfile?.username?.[0]?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                {!isSuperAdmin && userProfile?.username ? (
                  <span className="hidden md:inline-block text-sm font-medium text-foreground">
                    {userProfile.username}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {isSuperAdmin ? getRoleLabel(userProfile) : userProfile?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/')}>
                <Globe className="mr-2 h-4 w-4" />
                <span>View Website</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </header>
  );
}
