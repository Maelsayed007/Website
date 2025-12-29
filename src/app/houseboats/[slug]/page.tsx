import HouseboatDetail from '@/components/houseboat-detail';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { HouseboatModel } from '@/lib/data-firestore';

async function getHouseboat(slug: string): Promise<HouseboatModel | null> {
  const supabase = await createClient();

  // Try fetching by slug first
  let { data, error } = await supabase
    .from('houseboat_models')
    .select('*')
    .eq('slug', slug)
    .single();

  // If not found by slug, try by ID (compatibility with some links using ID)
  if (!data) {
    const { data: byId, error: idError } = await supabase
      .from('houseboat_models')
      .select('*')
      .eq('id', slug)
      .single();

    data = byId;
  }

  if (!data) {
    return null;
  }

  return data as any;
}

export default async function HouseboatDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const houseboat = await getHouseboat(slug);

  if (!houseboat) {
    notFound();
  }

  // Pass the resolved ID to the client component ensures consistent fetching
  return <HouseboatDetail slug={houseboat.id} />;
}
