import RestaurantPageContent from '@/components/restaurant-page-content';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';

export default async function RestaurantPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);

  return <RestaurantPageContent dictionary={dictionary.restaurant} />;
}
