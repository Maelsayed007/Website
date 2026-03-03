import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import { Farro } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import SupabaseProvider from '@/components/providers/supabase-provider';
import './globals.css';
import '../styles/tokens.css';
import '../styles/theme.css';
import '../styles/motion.css';
import '../styles/utilities.css';
import AppLayout from '@/components/app-layout';
import {
  getDictionary,
  getFooterDictionary,
  getNavigationDictionary,
} from '@/lib/dictionary';
import type { LayoutDictionary } from '@/lib/i18n/types';

const headingFont = Farro({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-heading-runtime',
  display: 'swap',
});

const bodyFont = localFont({
  src: './fonts/NotoSansRegular.ttf',
  variable: '--font-body-runtime',
  display: 'swap',
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
  const navigation = await getNavigationDictionary(locale);
  const footer = await getFooterDictionary(locale);
  const layoutDictionary: LayoutDictionary = {
    navigation,
    footer: {
      ...footer,
      tagline: footer.tagline || dictionary.homepage?.hero?.subtitle || '',
    },
  };

  return (
    <html lang={locale} className={`${headingFont.variable} ${bodyFont.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <Script id="strip-ext-attrs" strategy="beforeInteractive">
          {`(function(){ try { var el = document.documentElement; if (!el) return; var attrs = ['webcrx', 'g_editable', 'g_inited']; attrs.forEach(function(a){ if (el.hasAttribute(a)) el.removeAttribute(a); }); var badClasses = ['trancy-ar','trancy-rtl','trancy-ltr','translate-web-extension','g_translate']; badClasses.forEach(function(c){ if (el.classList.contains(c)) el.classList.remove(c); }); } catch (e) {} })();`}
        </Script>
        <Script id="chunk-recovery" strategy="beforeInteractive">
          {`(function(){ try { var KEY='__amieira_chunk_reloaded__'; function shouldReload(msg, err){ var text=(msg||'')+' '+((err&&err.message)||''); return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Loading CSS chunk/i.test(text); } function reloadOnce(){ if(sessionStorage.getItem(KEY)==='1') return; sessionStorage.setItem(KEY,'1'); window.location.reload(); } window.addEventListener('error', function(ev){ if(shouldReload(ev && ev.message, ev && ev.error)) reloadOnce(); }, true); window.addEventListener('unhandledrejection', function(ev){ var reason = ev && ev.reason; if(shouldReload('', reason)) reloadOnce(); }, true); window.addEventListener('load', function(){ sessionStorage.removeItem(KEY); }); } catch (e) {} })();`}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <SupabaseProvider>
          <AppLayout dictionary={layoutDictionary} locale={locale}>
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

