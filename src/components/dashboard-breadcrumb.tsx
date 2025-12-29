'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  'houseboat-reservations': 'Houseboat Reservations',
  'restaurant-reservations': 'Restaurant Reservations',
  'daily-travel-reservations': 'Daily Travel Reservations',
  clients: 'Clients',
  messages: 'Messages',
  'activity-log': 'Activity Log',
  printables: 'Printables',
  settings: 'Settings',
  general: 'General',
  houseboats: 'Houseboats',
  tariffs: 'Tariffs',
  'daily-travel': 'Daily Travel',
  restaurant: 'Restaurant',
  extras: 'Extras',
  vouchers: 'Vouchers',
  testimonials: 'Testimonials',
  documents: 'Documents',
  staff: 'Staff',
};

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  
  const pathSegments = pathname.split('/').filter(Boolean);
  const segments = pathSegments.slice(1);

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link 
        href="/dashboard" 
        className="text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        Dashboard
      </Link>
      
      {segments.map((segment, index) => {
        const href = '/dashboard/' + segments.slice(0, index + 1).join('/');
        const label = routeLabels[segment] || segment;
        const isLast = index === segments.length - 1;

        return (
          <Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-semibold text-foreground">{label}</span>
            ) : (
              <Link 
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
