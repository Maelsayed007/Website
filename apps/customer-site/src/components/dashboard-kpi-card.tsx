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
  suffix?: string;
  className?: string;
};

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  isLoading = false,
  trend,
  subtitle,
  suffix,
  className
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
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-[#18230F]/10 bg-white p-6 transition-all hover:border-[#34C759]/30 shadow-none",
      className
    )}>
      {/* Content */}
      <div className="relative space-y-3">
        {/* Title and Icon */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#854d0e]/60 uppercase tracking-widest">{title}</p>
          <div className="rounded-full bg-amber-50 p-2 border border-[#854d0e]/5">
            <Icon className="h-4 w-4 text-[#854d0e]" />
          </div>
        </div>

        {/* Value */}
        <div className="space-y-0.5">
          <p className="text-3xl font-black tracking-tight text-[#18230F]">
            {value.toLocaleString()}{suffix}
          </p>
          {subtitle && (
            <p className="text-xs font-bold text-[#854d0e]/40">{subtitle}</p>
          )}
        </div>

        {/* Change Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              actualTrend === 'up'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            {actualTrend === 'up' ? (
              <ArrowUp className="h-2.5 w-2.5" />
            ) : (
              <ArrowDown className="h-2.5 w-2.5" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
          <p className="text-[10px] font-bold text-[#854d0e]/30 uppercase">Growth</p>
        </div>
      </div>
    </div>
  );
}
