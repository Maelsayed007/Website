import { HouseboatDetail } from '@/features/houseboats';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

async function getHouseboatData(slug: string) {
  const supabase = await createClient();

  // 1. Fetch the model first to get its ID if slug is used
  let { data: model, error } = await supabase
    .from('houseboat_models')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!model) {
    const { data: byId } = await supabase
      .from('houseboat_models')
      .select('*')
      .eq('id', slug)
      .single();
    model = byId;
  }

  if (!model) return null;

  // 2. Fetch related data in parallel
  const [pricesRes, unitsRes, bookingsRes] = await Promise.all([
    supabase.from('houseboat_prices').select('*').eq('model_id', model.id),
    supabase.from('boats').select('*').eq('model_id', model.id),
    supabase.from('bookings').select('*')
  ]);

  return {
    model: {
      ...model,
      optimalCapacity: model.optimal_capacity,
      maximumCapacity: model.maximum_capacity,
      imageUrls: model.image_urls || []
    },
    prices: pricesRes.data || [],
    units: unitsRes.data || [],
    bookings: bookingsRes.data || []
  };
}

export default async function HouseboatDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const serverData = await getHouseboatData(slug);

  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  if (!serverData) {
    notFound();
  }

  return <HouseboatDetail slug={serverData.model.id} serverData={serverData} locale={locale} />;
}
