'use client';

import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: 'confirmed' | 'pending' | 'maintenance' | 'cancelled' | 'checkout' | 'reserved';
  children?: React.ReactNode;
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    confirmed: 'bg-[#E8F5E9] text-[#2E7D32] border-[#90C17C]',
    pending: 'bg-[#FFF9E6] text-[#F57C00] border-[#FFB74D]',
    maintenance: 'bg-[#FFE0B2] text-[#E65100] border-[#FF9800]',
    cancelled: 'bg-[#FFEBEE] text-[#C62828] border-[#EF5350]',
    checkout: 'bg-[#E3F2FD] text-[#1565C0] border-[#42A5F5]',
    reserved: 'bg-[#F3E5F5] text-[#6A1B9A] border-[#AB47BC]'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
      variants[status]
    )}>
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
