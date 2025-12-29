
import { LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type ActivityCardProps = {
  id: string;
  icon: LucideIcon;
  clientName: string;
  details: string;
  timestamp: Date;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  href: string;
  type: 'houseboat' | 'restaurant' | 'dailyTravel';
};

const statusColors = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const typeColors = {
  houseboat: 'bg-blue-50 text-blue-600',
  restaurant: 'bg-orange-50 text-orange-600',
  dailyTravel: 'bg-purple-50 text-purple-600',
};

export function ActivityCard({
  id,
  icon: Icon,
  clientName,
  details,
  timestamp,
  status,
  href,
  type,
}: ActivityCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md dark:hover:bg-card/80 card-lift"
    >
      {/* Icon */}
      <div className={cn('rounded-lg p-2.5', typeColors[type])}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground">{clientName}</p>
          <Badge variant="outline" className={cn('text-xs', statusColors[status])}>
            {status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{details}</p>
      </div>

      {/* Time and Arrow */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
