import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'base' | 'subtle' | 'inverse';
}

export function SurfaceCard({ className, tone = 'base', ...props }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        tone === 'base' && 'bg-card text-card-foreground border-border',
        tone === 'subtle' && 'bg-brand-surface text-foreground border-border',
        tone === 'inverse' && 'bg-brand-ink text-white border-white/15',
        className
      )}
      {...props}
    />
  );
}

