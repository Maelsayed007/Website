'use client';

import { format } from 'date-fns';
import { StatusBadge } from './status-badge';
import { Calendar, User, Ship, Utensils, Info } from 'lucide-react';

type OperationItem = {
    id: string;
    clientName: string;
    time: string;
    details: string;
    status: string;
};

type OperationsTableProps = {
    title: string;
    items: OperationItem[];
    type: 'arrival' | 'departure' | 'generic';
    emptyMessage?: string;
};

export function OperationsTable({ title, items, type, emptyMessage = "No scheduled operations" }: OperationsTableProps) {
    const getStatusVariant = (status: string) => {
        const lower = status.toLowerCase();
        if (lower.includes('confirm')) return 'confirmed';
        if (lower.includes('pending')) return 'pending';
        if (lower.includes('maintenance')) return 'maintenance';
        if (lower.includes('checkout')) return 'checkout';
        if (lower.includes('reserved')) return 'reserved';
        return 'confirmed';
    };

    return (
        <div className="bg-white rounded-2xl border border-[#E5E3DD] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#E5E3DD] bg-[#FAFAF8]">
                <h3 className="text-sm font-black text-[#1A2E1A] uppercase tracking-[0.1em]">{title}</h3>
            </div>

            {items.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-[#C4C4C4]" />
                    <p className="text-sm text-[#6B6B6B]">{emptyMessage}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#F5F3EE]/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5F738C] uppercase tracking-[0.1em]">Client</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5F738C] uppercase tracking-[0.1em]">Details</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5F738C] uppercase tracking-[0.1em]">Date & Time</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5F738C] uppercase tracking-[0.1em]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E3DD]">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-[#5F738C]" />
                                            <span className="text-sm font-bold text-[#1A2E1A]">{item.clientName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2">
                                            {item.status.toLowerCase().includes('reserved') ? (
                                                <Utensils className="h-4 w-4 text-[#5F738C]" />
                                            ) : type === 'generic' ? (
                                                <Info className="h-4 w-4 text-[#5F738C]" />
                                            ) : (
                                                <Ship className="h-4 w-4 text-[#5F738C]" />
                                            )}
                                            <span className="text-sm font-medium text-[#5F738C]">{item.details}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-sm text-[#1A2E1A] font-bold">
                                            {format(new Date(item.time), 'MMM dd, HH:mm')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <StatusBadge status={getStatusVariant(item.status)}>
                                            {item.status}
                                        </StatusBadge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
