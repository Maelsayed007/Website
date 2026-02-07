'use client';

import { Bell, Search, Settings, LogOut, Globe, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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
  const { user, signOut } = useAuth();
  const isHardcodedAdmin = user?.email === 'myasserofficial@gmail.com';

  const handleLogout = async () => {
    try {
      await signOut();
      // Router push handled in provider, but safe to keep or remove depending on provider logic. 
      // Provider does router.push('/'); let's keep it consistent or rely on provider.
      // The provider's onAuthStateChange handles the redirect usually, but explicit push is fine.
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-6 shadow-sm">
      {/* Breadcrumbs */}
      <div className="flex-1">
        <DashboardBreadcrumb />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 md:w-auto md:px-3 text-foreground/80 hover:text-foreground"
          onClick={onSearchClick}
        >
          <Search className="h-4 w-4" />
          <span className="ml-2 hidden md:inline-flex text-xs">
            Search
          </span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
            <span>⌘</span>K
          </kbd>
        </Button>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Settings */}
        {canAccessSettings && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-foreground/80 hover:text-foreground"
            onClick={() => router.push('/dashboard/settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 gap-2 px-2 hover:bg-muted">
              <Avatar className="h-6 w-6">
                {user?.photoURL ? (
                  <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                ) : (
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {userProfile?.username?.[0].toUpperCase() || 'A'}
                  </AvatarFallback>
                )}
              </Avatar>
              {!isHardcodedAdmin && userProfile?.username && (
                <span className="hidden md:inline-block text-sm font-medium text-foreground">
                  {userProfile.username}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">
                  {isHardcodedAdmin ? 'Site Administrator' : userProfile?.username}
                </p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
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
    </header>
  );
}
