'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Ship, Utensils, Calendar, X, ExternalLink, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

type DashboardNotification = {
    id: string;
    type: 'houseboat' | 'restaurant' | 'travel';
    clientName: string;
    startTime: string;
    endTime: string;
    houseboatName?: string;
    status: string;
    createdAt: number;
};

type NotificationContextType = {
    notifications: DashboardNotification[];
    dismissNotification: (id: string) => void;
    clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { supabase } = useSupabase();
    const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
    const router = useRouter();

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('dashboard_alerts');
        if (saved) {
            try {
                setNotifications(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    // Save to localStorage whenever notifications change
    useEffect(() => {
        localStorage.setItem('dashboard_alerts', JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = useCallback((booking: any) => {
        const type = booking.houseboat_id ? 'houseboat' : booking.restaurant_table_id ? 'restaurant' : 'travel';

        // Don't add if already in list
        setNotifications(prev => {
            if (prev.some(n => n.id === booking.id)) return prev;
            return [{
                id: booking.id,
                type,
                clientName: booking.client_name,
                startTime: booking.start_time,
                endTime: booking.end_time || booking.start_time,
                houseboatName: booking.boat_name,
                status: booking.status,
                createdAt: Date.now()
            }, ...prev];
        });

        // Play notification sound if desired
        try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { }); // Ignore browse block
        } catch (e) { }
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    useEffect(() => {
        if (!supabase) return;

        // Listen for NEW bookings
        const channel = supabase
            .channel('dashboard-realtime-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bookings' },
                (payload) => {
                    console.log('NEW BOOKING DETECTED:', payload);
                    // Only alert for NEW paid client reservations (source: website)
                    if (payload.new.status !== 'Cancelled' && payload.new.source === 'website') {
                        addNotification(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, addNotification]);

    return (
        <NotificationContext.Provider value={{ notifications, dismissNotification, clearAll }}>
            {children}

            {/* Persistent Notification Overlay */}
            <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-72">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className="pointer-events-auto bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-right duration-300 hover:scale-[1.01] transition-transform cursor-pointer group"
                        onClick={() => {
                            const path = notif.type === 'houseboat'
                                ? `/dashboard/houseboat-reservations?highlight=${notif.id}`
                                : `/dashboard/reservations`;
                            router.push(path);
                            dismissNotification(notif.id);
                        }}
                    >
                        <div className="flex">
                            <div className="w-1 bg-emerald-500" />
                            <div className="flex-1 p-3">
                                <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="p-1 bg-emerald-50 dark:bg-emerald-950 rounded">
                                            {notif.type === 'houseboat' ? <Ship className="w-3 h-3 text-emerald-600" /> : <Calendar className="w-3 h-3 text-emerald-600" />}
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">New Payment</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismissNotification(notif.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                        {notif.clientName}
                                    </h4>
                                    {notif.houseboatName && (
                                        <p className="text-[10px] font-medium text-emerald-600/80">
                                            {notif.houseboatName}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {format(parseISO(notif.startTime), 'MMM dd')} - {format(parseISO(notif.endTime), 'MMM dd')}
                                    </p>
                                </div>

                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                        PAID
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5 group-hover:text-emerald-500 transition-colors">
                                        Review <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

// Just used to import Clock icon which was missing in imports above but used in code
import { Clock } from 'lucide-react';

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
