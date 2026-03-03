import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardFilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardFilterBar({ children, className }: DashboardFilterBarProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        {children}
      </CardContent>
    </Card>
  );
}

