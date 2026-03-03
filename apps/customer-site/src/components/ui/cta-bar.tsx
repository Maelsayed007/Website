import * as React from 'react';
import { cn } from '@/lib/utils';

export type CtaBarProps = React.HTMLAttributes<HTMLDivElement>;

export function CtaBar({ className, ...props }: CtaBarProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-primary/25 bg-gradient-to-r from-brand-primary to-brand-primary-strong text-white',
        className
      )}
      {...props}
    />
  );
}
