import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'maintenance'
  | 'info';

type DashboardStatusBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<StatusTone, string> = {
  pending:
    'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-500/15 dark:text-amber-300',
  confirmed:
    'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-500/15 dark:text-emerald-300',
  completed:
    'border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-700/40 dark:bg-blue-500/15 dark:text-blue-300',
  cancelled:
    'border border-red-200 bg-red-100 text-red-800 dark:border-red-700/40 dark:bg-red-500/15 dark:text-red-300',
  maintenance:
    'border border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-500/20 dark:text-slate-200',
  info: 'border border-border bg-muted text-foreground',
};

export function DashboardStatusBadge({
  tone,
  children,
  className,
}: DashboardStatusBadgeProps) {
  return (
    <Badge className={cn('rounded-full px-2.5 py-1 text-xs font-semibold shadow-none', TONE_CLASSES[tone], className)}>
      {children}
    </Badge>
  );
}

export function getStatusTone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (normalized.includes('pending')) return 'pending';
  if (normalized.includes('confirm')) return 'confirmed';
  if (normalized.includes('complete') || normalized.includes('checkout')) return 'completed';
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('maint')) return 'maintenance';
  return 'info';
}

