import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { DashboardBooking, DashboardSummary } from '@/lib/dashboard/types';

export async function fetchDashboardBookings(limit = 200): Promise<DashboardBooking[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as DashboardBooking[];
}

export function computeDashboardSummary(bookings: DashboardBooking[]): DashboardSummary {
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'Pending').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    totalRevenue,
  };
}
