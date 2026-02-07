import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';
import SupabaseProvider from '@/components/providers/supabase-provider';
import './globals.css';
import { Outfit, Londrina_Solid } from 'next/font/google';
import AppLayout from '@/components/app-layout';
import { getDictionary } from '@/lib/dictionary';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
});

const londrinaSolid = Londrina_Solid({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: {
    default: 'Amieira Getaways',
    template: '%s | Amieira Getaways',
  },
  description: 'Book your dream houseboat or reserve a table at our exclusive restaurant in the beautiful Amieira marina.',
  keywords: ['houseboat rental', 'restaurant reservation', 'Amieira', 'Portugal', 'getaway', 'vacation', 'Alqueva', 'Grande Lago'],
  authors: [{ name: 'Amieira Getaways' }],
};

import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);
  const navigationDictionary = {
    navigation: {
      links: {
        home: "Home",
        houseboats: dictionary.houseboats.title,
        dailyTravel: dictionary.dailyTravel.title,
        restaurant: dictionary.restaurant.hero.title,
        gallery: dictionary.gallery.title,
        contact: dictionary.contact.title
      },
      auth: {
        login: "Sign In",
        register: "Register",
        logout: "Sign Out",
        dashboard: "Dashboard"
      }
    },
    footer: {
      tagline: dictionary.homepage.hero.subtitle,
      explore: {
        title: "Explore",
        home: "Home",
        houseboats: dictionary.houseboats.title,
        restaurant: dictionary.restaurant.hero.title,
        gallery: dictionary.gallery.title,
        contact: dictionary.contact.title
      },
      legal: {
        title: "Legal",
        privacy: "Privacy Policy",
        terms: "Terms of Service"
      },
      connect: {
        title: "Connect"
      },
      rightsReserved: "All rights reserved."
    }
  };

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${outfit.variable} ${londrinaSolid.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <Script id="strip-ext-attrs" strategy="beforeInteractive">
          {`(function(){ try { var el = document.documentElement; if (!el) return; var attrs = ['webcrx', 'g_editable', 'g_inited']; attrs.forEach(function(a){ if (el.hasAttribute(a)) el.removeAttribute(a); }); var badClasses = ['trancy-ar','trancy-rtl','trancy-ltr','translate-web-extension','g_translate']; badClasses.forEach(function(c){ if (el.classList.contains(c)) el.classList.remove(c); }); } catch (e) {} })();`}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <SupabaseProvider>
          <AppLayout dictionary={navigationDictionary}>
            <div className="animate-fade-in-up">
              {children}
            </div>
          </AppLayout>
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}
