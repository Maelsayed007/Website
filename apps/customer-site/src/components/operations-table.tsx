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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-6 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Client</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Details</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Date & Time</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{item.clientName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      {item.status.toLowerCase().includes('reserved') ? (
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                      ) : type === 'generic' ? (
                        <Info className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Ship className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">{item.details}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm font-medium text-foreground">
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
