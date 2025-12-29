import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

type KPICardProps = {
  title: string;
  value: number;
  change: number;
  icon: LucideIcon;
  isLoading?: boolean;
  trend?: 'up' | 'down';
  subtitle?: string;
};

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  isLoading = false,
  trend,
  subtitle
}: KPICardProps) {
  const isPositive = change >= 0;
  const actualTrend = trend || (isPositive ? 'up' : 'down');

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30 card-lift">
      {/* Content */}
      <div className="relative space-y-3">
        {/* Title and Icon */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-2">
            <Icon className="h-4 w-4 text-primary dark:text-primary" />
          </div>
        </div>

        {/* Value */}
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Change Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              actualTrend === 'up'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {actualTrend === 'up' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">vs last month</p>
        </div>
      </div>
    </div>
  );
}
