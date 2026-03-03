import { LandingPageContent } from '@/features/home';
import { getDictionary } from '@/lib/dictionary';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const [dictionary, pageData] = await Promise.all([
    getDictionary(locale),
    fetchLandingPageData(),
  ]);
  return <LandingPageContent dictionary={dictionary} serverData={pageData} />;
}

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing Supabase public environment variables.');
  }
  return createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const getCachedLandingPageData = unstable_cache(
  async () => {
    const supabase = getPublicSupabase();

    const [modelsRes, pricesRes] = await Promise.allSettled([
      supabase
        .from('houseboat_models')
        .select('id, slug, name, optimal_capacity, maximum_capacity, bedrooms, bathrooms')
        .order('name', { ascending: true })
        .limit(36),
      supabase
        .from('houseboat_prices')
        .select('model_id, weekday_price, weekend_price')
        .limit(200),
    ]);

    const models =
      modelsRes.status === 'fulfilled' && !modelsRes.value.error
        ? modelsRes.value.data || []
        : [];
    const prices =
      pricesRes.status === 'fulfilled' && !pricesRes.value.error
        ? pricesRes.value.data || []
        : [];

    return { models, prices };
  },
  ['home-landing-data-v1'],
  { revalidate: 300 }
);

async function fetchLandingPageData() {
  return getCachedLandingPageData();
}
