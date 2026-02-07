import GalleryPageContent from '@/components/gallery-page-content';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';

export default async function GalleryPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);

  return <GalleryPageContent dictionary={dictionary.gallery} />;
}
