import DailyTravelPageContent from '@/components/daily-travel-page-content';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';

export default async function DailyTravelPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);

  return <DailyTravelPageContent dictionary={dictionary} />;
}
