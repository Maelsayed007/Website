
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
  Pending: 'bg-amber-100/50 text-[#854d0e] border-[#854d0e]/10',
  Confirmed: 'bg-green-100/50 text-green-700 border-green-200',
  Cancelled: 'bg-red-100/50 text-red-700 border-red-200',
};

const typeColors = {
  houseboat: 'bg-blue-100/50 text-blue-600',
  restaurant: 'bg-orange-100/50 text-orange-600',
  dailyTravel: 'bg-purple-100/50 text-purple-600',
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
      className="group flex items-center gap-4 rounded-2xl border border-[#18230F]/10 bg-white p-4 transition-all hover:border-[#34C759]/30 shadow-none"
    >
      {/* Icon */}
      <div className={cn('rounded-full p-2.5', typeColors[type])}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-[#18230F]">{clientName}</p>
          <Badge variant="outline" className={cn('text-[10px] font-bold uppercase py-0 px-2 rounded-full border-0', statusColors[status])}>
            {status}
          </Badge>
        </div>
        <p className="text-xs font-bold text-[#854d0e]/40">{details}</p>
      </div>

      {/* Time and Arrow */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold text-[#854d0e]/30 uppercase tracking-wider tabular-nums">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
        <div className="p-1 rounded-full bg-amber-50 group-hover:bg-[#34C759]/10 transition-colors">
          <ChevronRight className="h-4 w-4 text-[#854d0e]/20 group-hover:text-[#34C759] transition-all" />
        </div>
      </div>
    </Link>
  );
}
