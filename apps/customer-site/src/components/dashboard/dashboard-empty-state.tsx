import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function DashboardEmptyState({
  title,
  description,
  icon: Icon,
}: DashboardEmptyStateProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {Icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : null}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

