'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header/header-container';
import Footer from '@/components/layout/footer/footer-container';
import { useSupabase } from '@/components/providers/supabase-provider';

type AppContextType = {
  websiteSettings: {
    logoUrl?: string;
    companyName?: string;
    heroImageUrl?: string;
    restaurantHeroImageUrl?: string;
    homeHouseboatsImageUrl?: string;
    homeRiverCruiseImageUrl?: string;
    homeRestaurantImageUrl?: string;
    home_houseboats_image_url?: string;
    home_river_cruise_image_url?: string;
    home_restaurant_image_url?: string;
  } | null;
  navigationDictionary: any;
  isLoading: boolean;
  locale: string;
};

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppLayout');
  }
  return context;
}

type AppLayoutProps = {
  children: React.ReactNode;
  dictionary: any;
  locale: string;
};

export default function AppShell({ children, dictionary, locale }: AppLayoutProps) {
  const pathname = usePathname() || '';
  const { supabase } = useSupabase();
  const [websiteSettings, setWebsiteSettings] = useState<{
    logoUrl?: string;
    companyName?: string;
    heroImageUrl?: string;
    restaurantHeroImageUrl?: string;
    homeHouseboatsImageUrl?: string;
    homeRiverCruiseImageUrl?: string;
    homeRestaurantImageUrl?: string;
    home_houseboats_image_url?: string;
    home_river_cruise_image_url?: string;
    home_restaurant_image_url?: string;
  } | null>({
    logoUrl: '/amieira-logo.png',
    companyName: 'Amieira Marina',
  });
  const [isLoading] = useState(false);

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/staff-login';
  const isRestaurantRoute = pathname.startsWith('/restaurant');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!supabase) return;
      try {
        const baseSelect =
          'logoUrl:data->>logoUrl,companyName:data->>companyName,heroImageUrl:data->>heroImageUrl,homeHouseboatsImageUrl:data->>homeHouseboatsImageUrl,homeRiverCruiseImageUrl:data->>homeRiverCruiseImageUrl,homeRestaurantImageUrl:data->>homeRestaurantImageUrl,home_houseboats_image_url:data->>home_houseboats_image_url,home_river_cruise_image_url:data->>home_river_cruise_image_url,home_restaurant_image_url:data->>home_restaurant_image_url';
        const select = isRestaurantRoute
          ? `${baseSelect},restaurantHeroImageUrl:data->>restaurantHeroImageUrl`
          : baseSelect;
        const { data } = await supabase
          .from('site_settings')
          .select(select)
          .eq('key', 'main')
          .single();
        if (data) {
          const compactData = Object.fromEntries(
            Object.entries(data).filter(([, value]) => Boolean(value))
          );
          setWebsiteSettings((prev) => ({
            ...prev,
            ...compactData,
          }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, [isRestaurantRoute, supabase]);

  const isCheckout = pathname.startsWith('/checkout') || pathname.startsWith('/payment/');

  if (isDashboard) {
    return (
      <AppContext.Provider value={{ websiteSettings, navigationDictionary: dictionary.navigation, isLoading, locale }}>
        <div className="h-full flex flex-col">{children}</div>
      </AppContext.Provider>
    );
  }

  if (isAuthPage) {
    return (
      <AppContext.Provider value={{ websiteSettings, navigationDictionary: dictionary.navigation, isLoading, locale }}>
        <div className="site-shell flex min-h-screen flex-col">
          <Header navigation={dictionary.navigation} websiteSettings={websiteSettings} />
          <main className="flex-grow">{children}</main>
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ websiteSettings, navigationDictionary: dictionary.navigation, isLoading, locale }}>
      <div className="site-shell flex min-h-screen flex-col">
        {!isCheckout && (
          <Header navigation={dictionary.navigation} websiteSettings={websiteSettings} isFixed />
        )}
        <main className="flex-grow">{children}</main>
        {!isCheckout && <Footer dictionary={dictionary.footer} />}
      </div>
    </AppContext.Provider>
  );
}
