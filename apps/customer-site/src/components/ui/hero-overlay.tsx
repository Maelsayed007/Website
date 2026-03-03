import * as React from 'react';
import { cn } from '@/lib/utils';

type HeroOverlayProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'dark';
};

export function HeroOverlay({ className, tone = 'default', ...props }: HeroOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0',
        tone === 'default' && 'bg-gradient-to-b from-[#081328]/70 via-[#081328]/35 to-[#081328]/10',
        tone === 'dark' && 'bg-gradient-to-b from-black/75 via-black/45 to-black/20',
        className
      )}
      {...props}
    />
  );
}

