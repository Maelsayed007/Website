'use client';

import { cn } from '@/lib/utils';

type CompactDockStatusProps = {
    boats: Array<{
        id: string;
        name: string;
        status: 'In Port' | 'On Lake' | 'Maintenance';
    }>;
    isLoading?: boolean;
};

export function CompactDockStatus({ boats, isLoading }: CompactDockStatusProps) {
    const statusColors = {
        'In Port': 'bg-[#E8F5E9] text-[#2E7D32]',
        'On Lake': 'bg-[#E3F2FD] text-[#1565C0]',
        'Maintenance': 'bg-[#FFE0B2] text-[#E65100]'
    };

    const statusCounts = {
        'In Port': boats.filter(b => b.status === 'In Port').length,
        'On Lake': boats.filter(b => b.status === 'On Lake').length,
        'Maintenance': boats.filter(b => b.status === 'Maintenance').length
    };

    return (
        <div className="bg-white rounded-xl border border-[#E5E3DD] p-6">
            <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-4">Fleet Status</h3>

            <div className="space-y-3 mb-6">
                {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-[#6B6B6B]">{status}</span>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold",
                            statusColors[status as keyof typeof statusColors]
                        )}>
                            {count}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {boats.map((boat) => (
                    <div key={boat.id} className="flex items-center justify-between py-2 border-b border-[#E5E3DD] last:border-0">
                        <span className="text-sm font-medium text-[#1A1A1A]">{boat.name}</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-semibold",
                            statusColors[boat.status]
                        )}>
                            {boat.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
