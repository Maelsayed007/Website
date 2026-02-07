'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Mail,
    Phone,
    Calendar,
    Ship,
    Utensils,
    Calendar as CalendarIcon,
    CreditCard,
    User,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Customer360ViewProps = {
    clientEmail?: string;
    clientName?: string;
};

export function Customer360View({ clientEmail, clientName }: Customer360ViewProps) {
    const { supabase } = useSupabase();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase || (!clientEmail && !clientName)) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // If we have an email, use it as primary key. If not, use name.
                let query = supabase.from('bookings').select('*');

                if (clientEmail) {
                    query = query.eq('client_email', clientEmail);
                } else if (clientName) {
                    query = query.eq('client_name', clientName);
                }

                const { data, error } = await query.order('start_time', { ascending: false });

                if (error) throw error;
                if (data) {
                    setBookings(data);
                }
            } catch (err) {
                console.error('Error fetching customer 360 data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [supabase, clientEmail, clientName]);

    const stats = useMemo(() => {
        if (!bookings) return { totalBookings: 0, totalSpent: 0, lastTrip: null };

        const totalSpent = bookings.reduce((sum, b) => {
            // Use total_price or amount_paid
            const price = b.total_price || b.price || 0;
            return sum + (b.status !== 'Cancelled' ? price : 0);
        }, 0);

        const lastTrip = bookings.find(b => b.status === 'Confirmed' || b.status === 'Completed');

        return {
            totalBookings: bookings.length,
            totalSpent,
            lastTrip
        };
    }, [bookings]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Column: Profile & Stats (Sidebar) */}
                <div className="w-full lg:w-[260px] space-y-4 shrink-0">
                    {/* Clean Profile Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center text-center group transition-all hover:bg-slate-50/50">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 ring-4 ring-slate-50 transition-all group-hover:scale-105 group-hover:text-emerald-600 group-hover:bg-emerald-50 group-hover:ring-emerald-50/50">
                            <User className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 truncate max-w-full px-2">
                            {clientName || (clientEmail ? clientEmail.split('@')[0] : 'Guest Client')}
                        </h3>
                        <div className="bg-slate-100/50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-slate-100/50">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[160px]">
                                {clientEmail || 'No email provided'}
                            </span>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all hover:border-emerald-200">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trips</p>
                                <p className="text-xl font-bold text-slate-900 leading-none">{stats.totalBookings}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                <Ship className="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all hover:border-emerald-200">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spent</p>
                                <p className="text-xl font-bold text-slate-900 leading-none">€{stats.totalSpent.toLocaleString()}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                <CreditCard className="h-4.5 w-4.5" />
                            </div>
                        </div>
                    </div>

                    {stats.lastTrip && (
                        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <History className="h-12 w-12" />
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Insight</span>
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-bold text-white mb-0.5">
                                    {stats.totalSpent > 1000 ? 'Frequent Traveller' : 'Returning Client'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Last seen <span className="text-slate-200">
                                        {stats.lastTrip?.start_time ? format(new Date(stats.lastTrip.start_time), 'MMM yyyy') : 'Recently'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="bg-slate-50/30 rounded-2xl p-4 h-full border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-3.5 w-3.5 text-slate-300" /> Activity History
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                {bookings.length} items
                            </span>
                        </div>

                        {bookings.length > 0 ? (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {bookings.map((booking) => {
                                    const isHouseboat = !!booking.houseboat_id;
                                    const isRestaurant = !!booking.restaurant_table_id;
                                    const isTravel = !!booking.daily_travel_package_id;

                                    return (
                                        <div key={booking.id} className="group relative flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-sm transition-all duration-200">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border border-slate-50",
                                                isHouseboat ? "bg-emerald-50 text-emerald-600" :
                                                    isRestaurant ? "bg-amber-50 text-amber-600" :
                                                        "bg-blue-50 text-blue-600"
                                            )}>
                                                {isHouseboat ? <Ship className="h-5 w-5" /> :
                                                    isRestaurant ? <Utensils className="h-5 w-5" /> :
                                                        <CalendarIcon className="h-5 w-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                                        {isHouseboat ? 'Houseboat' : isRestaurant ? 'Restaurant' : 'Tour'}
                                                    </p>
                                                    <span className="text-[11px] font-bold text-slate-900">€{(booking.total_price || booking.price || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {booking.start_time ? format(new Date(booking.start_time), 'MMM dd, yyyy') : 'Date missing'}
                                                    </p>
                                                    <Badge className={cn(
                                                        "text-[8px] px-1.5 h-4 rounded-md font-bold uppercase tracking-tighter",
                                                        booking.status === 'Confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" :
                                                            booking.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100" :
                                                                "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                                                    )}>
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-center bg-white/50 rounded-2xl border border-dashed border-slate-100">
                                <History className="h-8 w-8 text-slate-200 mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No activity found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
