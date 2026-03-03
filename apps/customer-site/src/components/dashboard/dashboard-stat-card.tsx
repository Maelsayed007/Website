import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardStatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning';
};

const TONE_STYLES: Record<
  NonNullable<DashboardStatCardProps['tone']>,
  { iconWrap: string; icon: string }
> = {
  default: {
    iconWrap: 'bg-primary/10',
    icon: 'text-primary',
  },
  success: {
    iconWrap: 'bg-emerald-100 dark:bg-emerald-500/15',
    icon: 'text-emerald-700 dark:text-emerald-300',
  },
  warning: {
    iconWrap: 'bg-amber-100 dark:bg-amber-500/15',
    icon: 'text-amber-700 dark:text-amber-300',
  },
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: DashboardStatCardProps) {
  const style = TONE_STYLES[tone];
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {Icon ? (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', style.iconWrap)}>
            <Icon className={cn('h-5 w-5', style.icon)} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

