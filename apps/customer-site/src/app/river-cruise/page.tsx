import { RiverCruisePageContent } from '@/features/river-cruise';
import { getDictionary } from '@/lib/dictionary';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function RiverCruisePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const [dictionary, serverData] = await Promise.all([
    getDictionary(locale),
    fetchRiverCruiseData()
  ]);

  return <RiverCruisePageContent dictionary={dictionary} serverData={serverData} locale={locale} />;
}

async function fetchRiverCruiseData() {
  const supabase = await createClient();

  const [pkgRes, boatRes, menuRes] = await Promise.all([
    supabase.from('daily_travel_packages').select('*'),
    supabase.from('package_boats').select('*, daily_boats(photo_url)'),
    supabase.from('restaurant_menus').select('*').eq('is_active', true).order('price_adult', { ascending: true }),
  ]);

  const pkgData = pkgRes.data || [];
  const boatAssignments = boatRes.data;

  const packagesWithDetails = pkgData.map((pkg: any) => {
    const firstBoatPhoto = boatAssignments?.find(a => a.package_id === pkg.id)?.daily_boats?.photo_url;
    return {
      ...pkg,
      boat_photo_url: firstBoatPhoto
    };
  });

  return {
    packages: packagesWithDetails,
    menus: menuRes.data || []
  };
}

