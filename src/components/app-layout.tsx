'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';

type AppLayoutProps = {
  children: React.ReactNode;
  dictionary: any;
}

export default function AppLayout({
  children,
  dictionary,
}: AppLayoutProps) {
  const pathname = usePathname() || '';

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/login';

  if (isDashboard) {
    return <div className="h-full flex flex-col">{children}</div>;
  }

  if (isAuthPage) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header navigation={dictionary.navigation} />
        <main className="flex-grow">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={dictionary.navigation} />
      <main className="flex-grow">{children}</main>
      <Footer dictionary={dictionary.footer} />
    </div>
  );
}
