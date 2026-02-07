import HomePageContent from '@/components/homepage-content';
import { getDictionary } from '@/lib/dictionary';

import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);
  return <HomePageContent dictionary={dictionary} />;
}
