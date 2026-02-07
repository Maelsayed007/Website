import HouseboatDetail from '@/components/houseboat-detail';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HouseboatModel } from '@/lib/types';

async function getHouseboat(slug: string): Promise<HouseboatModel | null> {
  const supabase = await createClient();

  let { data, error } = await supabase
    .from('houseboat_models')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!data) {
    const { data: byId } = await supabase
      .from('houseboat_models')
      .select('*')
      .eq('id', slug)
      .single();
    data = byId;
  }

  if (!data) return null;

  return {
    ...data,
    optimalCapacity: data.optimal_capacity,
    maximumCapacity: data.maximum_capacity,
    imageUrls: data.image_urls || []
  } as HouseboatModel;
}

export default async function HouseboatDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const houseboat = await getHouseboat(slug);

  if (!houseboat) {
    notFound();
  }

  return <HouseboatDetail slug={houseboat.id} />;
}
