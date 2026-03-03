import * as React from 'react';
import { cn } from '@/lib/utils';

type PillTabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function PillTab({ className, active, ...props }: PillTabProps) {
  return (
    <button
      className={cn(
        'h-11 rounded-full border px-4 text-sm font-semibold transition-all',
        active
          ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
          : 'bg-white text-foreground border-transparent hover:bg-brand-surface hover:border-border',
        className
      )}
      {...props}
    />
  );
}

