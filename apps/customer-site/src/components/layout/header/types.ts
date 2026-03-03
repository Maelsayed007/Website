import type { LucideIcon } from 'lucide-react';

export interface HeaderProps {
  navigation: {
    links: {
      home?: string;
      houseboats: string;
      riverCruise: string;
      restaurant: string;
      contact?: string;
    };
    auth: {
      login: string;
      register: string;
      logout: string;
      dashboard: string;
      myBookings?: string;
    };
  };
  websiteSettings?: {
    logoUrl?: string;
    companyName?: string;
    restaurantHeroImageUrl?: string;
  } | null;
  isFixed?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

export type ServiceItem = {
  id: 'houseboats' | 'river-cruise' | 'restaurant';
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  image: string;
};
