'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
] as const;

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const savedLocale = Cookies.get('NEXT_LOCALE') || 'en';
    setLocale(savedLocale);
  }, []);

  const onLocaleChange = (nextLocale: string) => {
    Cookies.set('NEXT_LOCALE', nextLocale, { expires: 365, sameSite: 'lax' });
    setLocale(nextLocale);
    router.replace(pathname);
    router.refresh();
  };

  return (
    <Select value={locale} onValueChange={onLocaleChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
