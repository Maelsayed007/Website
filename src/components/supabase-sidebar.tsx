'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Logo from './logo';
import {
    Settings,
    ChevronRight,
    LogOut
} from 'lucide-react';
import { useAuth } from './providers/supabase-provider';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

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
    userProfile?: { username?: string, email?: string } | null;
    hideLogo?: boolean;
};

export default function SupabaseSidebar({
    visibleLinks,
    canAccessSettings,
    userProfile,
    hideLogo
}: SupabaseSidebarProps) {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const [isHovered, setIsHovered] = useState(false);

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 bottom-0 z-50 flex flex-col transition-all duration-300 ease-in-out group shadow-2xl",
                "bg-card border-r border-border", // Solid card background for better contrast
                isHovered ? "w-64" : "w-16"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Universal Logo & Header Removal as requested */}

            {/* Navigation Links - Start from absolute top */}
            <nav className="flex-1 px-2 pt-6 space-y-1 overflow-y-auto no-scrollbar">
                {visibleLinks.map((link) => {
                    const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center h-10 rounded-md transition-all duration-200 group/link overflow-hidden",
                                isActive
                                    ? "bg-primary/20 text-primary font-semibold"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground font-medium"
                            )}
                        >
                            <div className="flex h-10 w-12 items-center justify-center shrink-0">
                                <Icon className={cn(
                                    "h-5 w-5 transition-transform duration-200",
                                    isActive && "scale-110"
                                )} />
                            </div>
                            <span className={cn(
                                "text-sm font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden",
                                isHovered ? "opacity-100 w-auto ml-1" : "opacity-0 w-0"
                            )}>
                                {link.label}
                            </span>
                            {isActive && isHovered && (
                                <div className="ml-auto mr-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto p-2 space-y-1 border-t border-border bg-sidebar-bg shrink-0">
                {canAccessSettings && (
                    <Link
                        href="/dashboard/settings"
                        className={cn(
                            "flex items-center h-10 rounded-md transition-all duration-200 group/link overflow-hidden",
                            pathname.startsWith('/dashboard/settings')
                                ? "bg-primary/20 text-primary font-semibold"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground font-medium"
                        )}
                    >
                        <div className="flex h-10 w-12 items-center justify-center shrink-0">
                            <Settings className="h-5 w-5" />
                        </div>
                        <span className={cn(
                            "text-sm font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden",
                            isHovered ? "opacity-100 w-auto ml-1" : "opacity-0 w-0"
                        )}>
                            Settings
                        </span>
                    </Link>
                )}

                <button
                    onClick={() => signOut()}
                    className="flex items-center h-10 w-full rounded-md text-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group/link overflow-hidden font-medium"
                >
                    <div className="flex h-10 w-12 items-center justify-center shrink-0">
                        <LogOut className="h-5 w-5" />
                    </div>
                    <span className={cn(
                        "text-sm font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden",
                        isHovered ? "opacity-100 w-auto ml-1" : "opacity-0 w-0"
                    )}>
                        Sign Out
                    </span>
                </button>

                {/* Profile Section */}
                <div className={cn(
                    "flex items-center h-12 mt-2 px-1 rounded-lg bg-muted/30 overflow-hidden transition-all duration-300",
                    isHovered ? "w-full" : "w-12 mx-auto justify-center"
                )}>
                    <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarImage src={`https://avatar.vercel.sh/${userProfile?.email || 'user'}`} />
                        <AvatarFallback className="bg-muted text-[10px]">UA</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                        "ml-3 flex flex-col transition-all duration-300 overflow-hidden",
                        isHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
                    )}>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                            {userProfile?.username || userProfile?.email?.split('@')[0] || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {userProfile?.email || ''}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
