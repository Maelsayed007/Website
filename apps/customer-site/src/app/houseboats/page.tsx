import { Suspense } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';
import { HouseboatsContent } from '@/features/houseboats';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HouseboatsListingLoadingSkeleton } from '@/components/loading/public-page-skeletons';

export default async function HouseboatsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const [dictionary, serverData] = await Promise.all([
    getDictionary(locale),
    fetchHouseboatsData(searchParams)
  ]);

  return (
    <Suspense fallback={<HouseboatsListingLoadingSkeleton />}>
      <HouseboatsContent dictionary={dictionary} serverData={serverData} locale={locale} />
    </Suspense>
  );
}

async function fetchHouseboatsData(searchParams: { [key: string]: string | string[] | undefined }) {
  const fromParam = searchParams.from as string;
  const toParam = searchParams.to as string;
  const typeParam = searchParams.type as string;
  const isSearchMode = !!(fromParam && (typeParam === 'day_charter' ? fromParam : toParam));

  const supabase = await createClient();
  let result = await fetchHouseboatsWithClient(supabase, isSearchMode);

  if (!result.models.length) {
    try {
      const admin = createAdminClient();
      const adminResult = await fetchHouseboatsWithClient(admin, isSearchMode);
      if (adminResult.models.length) {
        result = adminResult;
      }
    } catch {
      // Keep anon result as fallback when service key is unavailable.
    }
  }

  return result;
}

async function fetchHouseboatsWithClient(client: any, isSearchMode: boolean) {
  const queries = [
    client.from('houseboat_models').select('*'),
    client.from('houseboat_prices').select('*'),
    client.from('boats').select('id, model_id, name')
  ];

  if (isSearchMode) {
    queries.push(client.from('bookings').select('*').gte('end_time', new Date().toISOString()));
  }

  const results = await Promise.all(queries);

  return {
    models: results[0].data || [],
    prices: results[1].data || [],
    units: results[2].data || [],
    bookings: isSearchMode ? results[3]?.data || [] : []
  };
}
