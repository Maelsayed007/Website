'use client';

import { format, isSameDay, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Ship, Calendar } from 'lucide-react';

type ScheduleItem = {
    id: string;
    clientName: string;
    time: string; // ISO string
    details: string; // "Houseboat name" or "Table 4"
    status: string;
};

type DashboardScheduleListProps = {
    title: string;
    items: ScheduleItem[];
    type: 'arrival' | 'departure' | 'generic';
    emptyMessage?: string;
    minimal?: boolean; // New prop
};

export function DashboardScheduleList({ title, items, type, emptyMessage = "No scheduled activity", minimal = false }: DashboardScheduleListProps) {
    // Group items by day (Today, Tomorrow, Day After)
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    const getDayLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isSameDay(date, today)) return 'Today';
        if (isSameDay(date, tomorrow)) return 'Tomorrow';
        if (isSameDay(date, dayAfter)) return format(dayAfter, 'EEEE');
        return format(date, 'MMM dd');
    };

    const groupedItems = items.reduce((acc, item) => {
        const label = getDayLabel(item.time);
        if (!acc[label]) acc[label] = [];
        acc[label].push(item);
        return acc;
    }, {} as Record<string, ScheduleItem[]>);

    // Ensure groups are in order (Today, Tomorrow, Day After)
    const orderedLabels = ['Today', 'Tomorrow', format(dayAfter, 'EEEE')].filter(label => groupedItems[label]);

    return (
        <div className={cn("h-full", !minimal && "bg-white rounded-2xl p-6 border border-[#18230F]/10")}>
            {!minimal && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#854d0e]">{title}</h3>
                    <div className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        type === 'arrival' ? "bg-emerald-100 text-emerald-700" :
                            type === 'departure' ? "bg-blue-100 text-blue-700" :
                                "bg-amber-100 text-amber-700"
                    )}>
                        {type === 'arrival' ? 'Inbound' : type === 'departure' ? 'Outbound' : 'Schedule'}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {items.length === 0 ? (
                    <div className="text-center py-8 opacity-50">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-[#854d0e]/40" />
                        <p className="text-sm font-bold text-[#854d0e]">{emptyMessage}</p>
                    </div>
                ) : (
                    orderedLabels.map(label => (
                        <div key={label} className="space-y-3">
                            <h4 className="text-xs font-bold text-[#854d0e]/40 uppercase tracking-widest pl-1">{label}</h4>
                            <div className="space-y-2">
                                {groupedItems[label].map(item => (
                                    <div key={item.id} className="flex items-center justify-between group p-2 hover:bg-amber-50 rounded-lg transition-colors cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-[#18230F]/5 text-[#854d0e]">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#18230F] leading-tight">{item.clientName}</p>
                                                <p className="text-xs text-[#854d0e]/60 font-medium">{item.details}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-[#18230F]">{format(new Date(item.time), 'HH:mm')}</p>
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-0 bg-transparent text-[#854d0e]/50 font-bold uppercase">
                                                {item.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
