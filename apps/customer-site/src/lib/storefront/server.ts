import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { HomePublicData } from '@/lib/storefront/types';

export async function fetchPublicHomeData(): Promise<HomePublicData> {
  const supabase = await createClient();

  const { data: boatsData, error } = await supabase
    .from('boats')
    .select('id, name, model_id')
    .limit(32);

  if (error) {
    throw error;
  }

  return {
    boats: boatsData || [],
  };
}
