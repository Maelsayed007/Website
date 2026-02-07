'use client';

import { Plus, UserPlus, Wrench, Calendar, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

export function CompactQuickActions() {
    const actions = [
        { icon: Plus, label: 'New Reservation', href: '/dashboard/houseboat-reservations', variant: 'primary' },
        { icon: UserPlus, label: 'Check-in', href: '/dashboard/houseboat-reservations', variant: 'default' },
        { icon: Wrench, label: 'Maintenance', href: '/dashboard/houseboat-reservations', variant: 'default' },
        { icon: Calendar, label: 'Schedule', href: '/dashboard/daily-travel-reservations', variant: 'default' },
    ];

    return (
        <div className="bg-white rounded-xl border border-[#E5E3DD] p-6">
            <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-4">Quick Actions</h3>

            <div className="space-y-2">
                {actions.map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className={
                            action.variant === 'primary'
                                ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-[#4CAF50] text-white hover:bg-[#45A049] transition-colors"
                                : "flex items-center gap-3 px-4 py-3 rounded-lg bg-[#F5F3EE] text-[#1A1A1A] hover:bg-[#E5E3DD] transition-colors"
                        }
                    >
                        <action.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{action.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
