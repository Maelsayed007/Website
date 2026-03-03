import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function DashboardPageHeader({
  title,
  description,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-h3 text-foreground">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

