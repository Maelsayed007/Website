import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';
import SupabaseProvider from '@/components/providers/supabase-provider';
import './globals.css';
import { Lexend, Comfortaa } from 'next/font/google';
import AppLayout from '@/components/app-layout';

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: {
    default: 'Amieira Getaways',
    template: '%s | Amieira Getaways',
  },
  description: 'Book your dream houseboat or reserve a table at our exclusive restaurant in the beautiful Amieira marina.',
  keywords: ['houseboat rental', 'restaurant reservation', 'Amieira', 'Portugal', 'getaway', 'vacation'],
};

// Hardcoded English navigation links
const navigationDictionary = {
  navigation: {
    links: {
      home: "Home",
      houseboats: "Houseboats",
      dailyTravel: "Daily Travel",
      restaurant: "Restaurant",
      gallery: "Gallery",
      contact: "Contact"
    },
    requestBooking: "Request Booking"
  },
  footer: {
    tagline: "Your escape to serenity.",
    explore: {
      title: "Explore",
      home: "Home",
      houseboats: "Houseboats",
      restaurant: "Restaurant",
      gallery: "Gallery",
      contact: "Contact"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className={`${lexend.variable} ${comfortaa.variable} scroll-smooth`} suppressHydrationWarning>
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
