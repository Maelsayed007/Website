import { Ship, UtensilsCrossed, Waves } from 'lucide-react';
import type { ServiceItem } from './types';

export const SERVICE_ITEMS: ServiceItem[] = [
  {
    id: 'houseboats',
    href: '/houseboats',
    icon: Ship,
    label: 'Houseboats',
    description: 'Multi-day floating escapes on the serene waters of Alqueva Lake',
    image: '/boat-hero.jpg',
  },
  {
    id: 'river-cruise',
    href: '/river-cruise',
    icon: Waves,
    label: 'River Cruise',
    description: 'Scenic day trips and magical sunset cruises across the lake',
    image: '/river-cruise-hero.jpg',
  },
  {
    id: 'restaurant',
    href: '/restaurant',
    icon: UtensilsCrossed,
    label: 'Restaurant',
    description: 'Authentic lakeside dining with traditional Portuguese flavors',
    image: '',
  },
];

export const SUPPORTED_LOCALES = ['en', 'pt', 'de', 'es', 'fr', 'it', 'nl'] as const;

