'use client';

import { Plus, Ship, Utensils, Calendar, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function QuickActions() {
    const actions = [
        {
            label: 'New Reservation',
            icon: Plus,
            href: '/dashboard/reservations?action=new',
            color: 'bg-[#34C759]',
            textColor: 'text-white'
        },
        {
            label: 'Check-in Boat',
            icon: Ship,
            href: '/dashboard/houseboat-reservations?action=checkin',
            color: 'bg-blue-500',
            textColor: 'text-white'
        },
        {
            label: 'Restaurant Booking',
            icon: Utensils,
            href: '/dashboard/restaurant-reservations?action=new',
            color: 'bg-orange-500',
            textColor: 'text-white'
        },
        {
            label: 'Schedule Maintenance',
            icon: Hammer,
            href: '/dashboard/activity-log?action=maintenance',
            color: 'bg-amber-500',
            textColor: 'text-white'
        }
    ];

    return (
        <div className="flex flex-wrap gap-3 items-center">
            {actions.map((action) => (
                <Link key={action.label} href={action.href}>
                    <Button
                        className={cn(
                            "h-11 px-6 rounded-full border-0 shadow-none hover:opacity-90 transition-all font-bold group",
                            action.color,
                            action.textColor
                        )}
                    >
                        <action.icon className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                        {action.label}
                    </Button>
                </Link>
            ))}
        </div>
    );
}
