import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Wrench } from 'lucide-react';

type Status = 'Pending' | 'Confirmed' | 'Cancelled' | 'Maintenance';

type StatusBadgeProps = {
  status: Status;
  showIcon?: boolean;
};

const statusConfig = {
  Pending: {
    variant: 'warning' as const,
    icon: Clock,
    label: 'Pending',
  },
  Confirmed: {
    variant: 'success' as const,
    icon: CheckCircle2,
    label: 'Confirmed',
  },
  Cancelled: {
    variant: 'error' as const,
    icon: XCircle,
    label: 'Cancelled',
  },
  Maintenance: {
    variant: 'info' as const,
    icon: Wrench,
    label: 'Maintenance',
  },
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  );
}
