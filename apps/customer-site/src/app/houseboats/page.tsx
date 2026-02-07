import { Suspense } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';
import HouseboatsContent from '@/components/houseboats-content';

export default async function HouseboatsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HouseboatsContent dictionary={dictionary} />
    </Suspense>
  );
}
