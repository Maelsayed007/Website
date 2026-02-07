import ContactPageContent from '@/components/contact-page-content';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';

export default async function ContactPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const dictionary = await getDictionary(locale);

  return <ContactPageContent dictionary={dictionary.contact} />;
}
