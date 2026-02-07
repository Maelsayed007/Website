'use client';

import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';


import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type DashboardRevenueChartProps = {
    data: {
        total: number;
        houseboat: number;
        restaurant: number;
        cruise: number;
    };
    sourceData?: Record<string, number>;
};

export function DashboardRevenueChart({ data, sourceData }: DashboardRevenueChartProps) {
    const [viewMode, setViewMode] = useState<'service' | 'source'>('service');

    return (
        <Card className="rounded-3xl border border-[#18230F]/10 shadow-sm relative overflow-hidden bg-white">
            <div className="absolute top-4 right-4 z-10">
                <div className="flex bg-[#18230F]/5 rounded-full p-1">
                    <button
                        onClick={() => setViewMode('service')}
                        className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            viewMode === 'service' ? "bg-white text-[#18230F] shadow-sm" : "text-[#854d0e]/60 hover:text-[#854d0e]"
                        )}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setViewMode('source')}
                        className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            viewMode === 'source' ? "bg-white text-[#18230F] shadow-sm" : "text-[#854d0e]/60 hover:text-[#854d0e]"
                        )}
                    >
                        Sources
                    </button>
                </div>
            </div>

            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-[#18230F] tracking-tight">
                            {viewMode === 'service' ? 'Revenue by Service' : 'Revenue by Source'}
                        </h3>
                        <p className="text-xs font-bold text-[#854d0e]/60 uppercase tracking-widest mt-1">This Month</p>
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-4xl font-black text-[#18230F] tracking-tighter">€{data.total.toLocaleString()}</p>
                </div>

                {/* Progress Bar (Service View Only usually, but let's keep it clean) */}
                <div className="h-3 w-full bg-[#18230F]/5 rounded-full overflow-hidden flex mb-8">
                    {viewMode === 'service' ? (
                        <>
                            <div className="h-full bg-emerald-500" style={{ width: `${(data.houseboat / (data.total || 1)) * 100}%` }} />
                            <div className="h-full bg-orange-500" style={{ width: `${(data.restaurant / (data.total || 1)) * 100}%` }} />
                            <div className="h-full bg-blue-500" style={{ width: `${(data.cruise / (data.total || 1)) * 100}%` }} />
                        </>
                    ) : (
                        <div className="h-full w-full bg-transparent flex">
                            {sourceData && Object.values(sourceData).map((val, i) => (
                                <div key={i} className="h-full first:rounded-l-full last:rounded-r-full border-r border-white/20 opacity-80"
                                    style={{ width: `${(val / (data.total || 1)) * 100}%`, backgroundColor: `hsl(${25 + (i * 30)}, 90%, 60%)` }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend / List */}
                <div className="space-y-4">
                    {viewMode === 'service' ? (
                        <>
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-bold text-[#18230F]">Houseboats</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#854d0e]/40">{((data.houseboat / (data.total || 1)) * 100).toFixed(0)}%</span>
                                    <span className="text-sm font-bold text-[#18230F]">€{data.houseboat.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                    <span className="text-sm font-bold text-[#18230F]">Restaurant</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#854d0e]/40">{((data.restaurant / (data.total || 1)) * 100).toFixed(0)}%</span>
                                    <span className="text-sm font-bold text-[#18230F]">€{data.restaurant.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="text-sm font-bold text-[#18230F]">Cruises</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#854d0e]/40">{((data.cruise / (data.total || 1)) * 100).toFixed(0)}%</span>
                                    <span className="text-sm font-bold text-[#18230F]">€{data.cruise.toLocaleString()}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                            {sourceData && Object.entries(sourceData).sort((a, b) => b[1] - a[1]).map(([source, amount], index) => (
                                <div key={source} className="flex items-center justify-between group py-1 border-b border-[#18230F]/5 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${25 + (index * 30)}, 90%, 60%)` }} />
                                        <span className="text-sm font-bold text-[#18230F] capitalize">{source}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-[#854d0e]/40">{((amount / (data.total || 1)) * 100).toFixed(0)}%</span>
                                        <span className="text-sm font-bold text-[#18230F]">€{amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                            {(!sourceData || Object.keys(sourceData).length === 0) && (
                                <p className="text-xs text-center text-[#854d0e]/50 py-4 font-medium">No source data available</p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
