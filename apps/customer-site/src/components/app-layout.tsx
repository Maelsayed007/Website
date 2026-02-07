'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useSupabase } from '@/components/providers/supabase-provider';

// Context to share active tab and website settings
type AppContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  websiteSettings: {
    logoUrl?: string;
    companyName?: string;
    heroImageUrl?: string;
  } | null;
  navigationDictionary: any;
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
}

export default function AppLayout({
  children,
  dictionary,
}: AppLayoutProps) {
  const pathname = usePathname() || '';
  const { supabase } = useSupabase();
  const [activeTab, setActiveTab] = useState('houseboats');
  const [websiteSettings, setWebsiteSettings] = useState<{
    logoUrl?: string;
    companyName?: string;
    heroImageUrl?: string;
  } | null>(null);

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/login' || pathname === '/staff-login';
  const isHomePage = pathname === '/';

  // Fetch website settings (including logo)
  useEffect(() => {
    const fetchSettings = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'main')
          .single();

        if (data && data.data) {
          setWebsiteSettings(data.data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, [supabase]);

  const isCheckout = pathname.startsWith('/checkout');

  if (isDashboard) {
    return <div className="h-full flex flex-col">{children}</div>;
  }

  if (isAuthPage) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header
          navigation={dictionary.navigation}
          websiteSettings={websiteSettings}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-grow">{children}</main>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab, websiteSettings, navigationDictionary: dictionary.navigation }}>
      <div className="flex min-h-screen flex-col">
        {!isHomePage && !isCheckout && (
          <Header
            navigation={dictionary.navigation}
            websiteSettings={websiteSettings}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isFixed={pathname !== '/houseboats'}
          />
        )}
        <main className="flex-grow">{children}</main>
        {!isCheckout && <Footer dictionary={dictionary.footer} />}
      </div>
    </AppContext.Provider>
  );
}
