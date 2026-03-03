'use client';

import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: 'confirmed' | 'pending' | 'maintenance' | 'cancelled' | 'checkout' | 'reserved';
  children?: React.ReactNode;
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    confirmed:
      'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-500/15 dark:text-emerald-300',
    pending:
      'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-500/15 dark:text-amber-300',
    maintenance:
      'border border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-500/20 dark:text-slate-200',
    cancelled:
      'border border-red-200 bg-red-100 text-red-800 dark:border-red-700/40 dark:bg-red-500/15 dark:text-red-300',
    checkout:
      'border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-700/40 dark:bg-blue-500/15 dark:text-blue-300',
    reserved:
      'border border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-700/40 dark:bg-indigo-500/15 dark:text-indigo-300'
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      variants[status]
    )}>
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
