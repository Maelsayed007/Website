'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVICE_ITEMS } from './service-items';

type HeaderServicesMegaMenuProps = {
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
  onEnter: () => void;
  navigation: {
    links: {
      houseboats: string;
      riverCruise: string;
      restaurant: string;
    };
  };
  websiteSettings?: {
    restaurantHeroImageUrl?: string;
  } | null;
};

export function HeaderServicesMegaMenu({
  pathname,
  isOpen,
  onClose,
  onEnter,
  navigation,
  websiteSettings,
}: HeaderServicesMegaMenuProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out origin-top mt-2.5',
        isOpen
          ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
      )}
      onMouseEnter={onEnter}
    >
      <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-[0_18px_36px_-24px_rgba(7,23,58,0.55)]">
        <div className="h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />

        <div className="px-8 py-7">
          <div className="grid grid-cols-3 gap-5">
            {SERVICE_ITEMS.map((service) => {
              const isActive = pathname === service.href;
              const ServiceIcon = service.icon;
              const label =
                service.id === 'houseboats'
                  ? navigation?.links?.houseboats || 'Houseboats'
                  : service.id === 'river-cruise'
                    ? navigation?.links?.riverCruise || 'River Cruise'
                    : navigation?.links?.restaurant || 'Restaurant';

              return (
                <Link
                  key={service.id}
                  href={service.href}
                  onClick={onClose}
                  className={cn(
                    'group/card relative rounded-[1.2rem] overflow-hidden transition-all duration-300',
                    'hover:shadow-[0_18px_34px_-20px_rgba(7,23,58,0.75)] hover:-translate-y-1',
                    isActive && 'ring-2 ring-brand-primary ring-offset-2'
                  )}
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={
                        service.id === 'restaurant'
                          ? websiteSettings?.restaurantHeroImageUrl || '/hero-placeholder-wide.jpg'
                          : service.image
                      }
                      alt={label}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                    />
                    <div className="media-gradient-overlay" />

                    <div
                      className={cn(
                        'absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                        isActive
                          ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/35'
                          : 'bg-white/20 text-white group-hover/card:bg-white/30'
                      )}
                    >
                      <ServiceIcon className="h-5 w-5" />
                    </div>

                    {isActive && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-brand-primary text-[10px] font-bold text-white uppercase tracking-wider">
                        Current
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-end justify-between">
                      <div className="pr-1">
                        <h3 className="text-white font-bold text-[1.05rem] leading-tight mb-0.5">{label}</h3>
                        <p className="text-white/75 text-xs font-medium line-clamp-1">{service.description}</p>
                      </div>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-all duration-300',
                          'group-hover/card:bg-brand-primary group-hover/card:text-white',
                          isActive ? 'bg-brand-primary text-white' : 'text-white'
                        )}
                      >
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/card:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
