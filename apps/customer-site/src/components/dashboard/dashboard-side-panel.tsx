import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardSidePanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function DashboardSidePanel({
  title,
  children,
  className,
}: DashboardSidePanelProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

