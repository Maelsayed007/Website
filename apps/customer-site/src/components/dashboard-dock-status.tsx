'use client';

import { Ship, Anchor, CheckCircle2, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

type BoatStatus = {
    id: string;
    name: string;
    status: 'In Port' | 'On Lake' | 'Maintenance';
};

type DashboardDockStatusProps = {
    boats: BoatStatus[];
    isLoading?: boolean;
};

export function DashboardDockStatus({ boats, isLoading }: DashboardDockStatusProps) {
    // Use passed boats data, simplify display to max 6 items if list is long
    const displayBoats = boats.slice(0, 8);

    return (
        <div className="bg-white rounded-2xl p-6 border border-[#18230F]/10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#854d0e]">Dock Status</h3>
                    <p className="text-sm text-[#854d0e]/60">Current fleet locations</p>
                </div>
                <Anchor className="h-5 w-5 text-[#854d0e]/40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-12 bg-amber-50/50 rounded-xl animate-pulse" />
                    ))
                ) : displayBoats.length > 0 ? (
                    displayBoats.map((boat) => (
                        <div
                            key={boat.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-[#18230F]/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    boat.status === 'In Port' ? "bg-emerald-100 text-emerald-600" :
                                        boat.status === 'On Lake' ? "bg-blue-100 text-blue-600" :
                                            "bg-amber-100 text-[#854d0e]"
                                )}>
                                    <Ship className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-[#854d0e]">{boat.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#18230F]/5 text-[10px] font-bold uppercase tracking-wider">
                                {boat.status === 'In Port' && (
                                    <>
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        <span className="text-emerald-700">Docked</span>
                                    </>
                                )}
                                {boat.status === 'On Lake' && (
                                    <>
                                        <Navigation className="h-3 w-3 text-blue-500" />
                                        <span className="text-blue-700">Out</span>
                                    </>
                                )}
                                {boat.status === 'Maintenance' && (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        <span className="text-orange-700">Maint.</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No boats found</p>
                )}
            </div>
        </div>
    );
}
