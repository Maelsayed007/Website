import { RestaurantPageContent } from '@/features/restaurant';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function RestaurantPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const [dictionary, menus] = await Promise.all([
    getDictionary(locale),
    fetchMenus()
  ]);

  return <RestaurantPageContent dictionary={dictionary} serverMenus={menus} locale={locale} />;
}

async function fetchMenus() {
  const supabase = await createClient();
  let menus = await fetchMenusWithClient(supabase);

  if (menus.length === 0) {
    try {
      const admin = createAdminClient();
      const adminMenus = await fetchMenusWithClient(admin);
      if (adminMenus.length) {
        menus = adminMenus;
      }
    } catch {
      // Keep anon result if service role is unavailable.
    }
  }

  return menus;
}

async function fetchMenusWithClient(client: any) {
  const { data, error } = await client
    .from('restaurant_menus')
    .select('id, name, description, price_adult, price_child, price_senior, is_active, sort_order, translations')
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data) return [];

  return data.map((m: any) => ({
    ...m,
    price_senior: m.price_senior || m.price_adult || 0,
  }));
}
