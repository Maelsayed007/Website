import type { SupabaseClient } from '@supabase/supabase-js';
import { endOfDay, startOfDay } from 'date-fns';
import type { Booking, ReservationQueryState } from './types';

type ReservationStats = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
};

const SORT_COLUMN_MAP: Record<string, keyof Booking> = {
  id: 'id',
  client_name: 'client_name',
  houseboat_id: 'houseboat_id',
  start_time: 'start_time',
  status: 'status',
  price: 'price',
  amount_paid: 'amount_paid',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

function applySearchFilter(query: any, rawSearch: string) {
  const search = rawSearch.trim();
  if (!search) return query;

  const normalized = search.replace(/[%()]/g, '');
  const pattern = `%${normalized}%`;
  return query.or(`client_name.ilike.${pattern},client_email.ilike.${pattern},id.ilike.${pattern}`);
}

function applyServiceFilter(query: any, service: string) {
  if (service === 'stay') {
    return query.not('houseboat_id', 'is', null);
  }

  if (service === 'meal') {
    return query.not('restaurant_table_id', 'is', null);
  }

  if (service === 'cruise') {
    // Daily cruise can be attached on either daily_travel_id or daily_travel_package_id.
    return query.or('daily_travel_id.not.is.null,daily_travel_package_id.not.is.null');
  }

  return query;
}

function applyPaymentStatusFilter(query: any, paymentStatus: string) {
  if (paymentStatus === 'paid') {
    return query.eq('payment_status', 'fully_paid');
  }
  if (paymentStatus === 'partial') {
    return query.eq('payment_status', 'deposit_paid');
  }
  if (paymentStatus === 'unpaid') {
    return query.or('payment_status.eq.unpaid,payment_status.is.null');
  }
  return query;
}

function applySort(query: any, state: ReservationQueryState) {
  const { sortConfig, activeTab } = state;

  // Accounts receivable view prioritizes newest items by default.
  if (!sortConfig) {
    return query.order('created_at', { ascending: false });
  }

  if (activeTab === 'ar' && sortConfig.key === 'price') {
    return query.order('created_at', { ascending: false });
  }

  const mappedColumn = SORT_COLUMN_MAP[sortConfig.key];
  if (!mappedColumn) {
    return query.order('created_at', { ascending: false });
  }

  return query.order(mappedColumn, { ascending: sortConfig.direction === 'asc' });
}

export async function fetchReservationsPage(
  supabase: SupabaseClient,
  state: ReservationQueryState
): Promise<{ data: Booking[]; totalItems: number }> {
  const from = (state.page - 1) * state.pageSize;
  const to = from + state.pageSize - 1;

  let query = supabase.from('bookings').select('*', { count: 'exact' });

  query = applySearchFilter(query, state.search);

  if (state.status !== 'All') {
    query = query.eq('status', state.status);
  }

  if (state.boat !== 'all') {
    query = query.eq('houseboat_id', state.boat);
  }

  if (state.service !== 'all') {
    query = applyServiceFilter(query, state.service);
  }

  if (state.paymentStatus !== 'all') {
    query = applyPaymentStatusFilter(query, state.paymentStatus);
  }

  if (state.activeTab === 'ar') {
    query = query.in('status', ['Confirmed', 'Completed']).neq('payment_status', 'fully_paid');
  }

  if (state.dateRange?.from) {
    query = query.gte('start_time', startOfDay(state.dateRange.from).toISOString());
    if (state.dateRange.to) {
      query = query.lte('start_time', endOfDay(state.dateRange.to).toISOString());
    }
  }

  query = applySort(query, state).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data as Booking[]) || [],
    totalItems: count || 0,
  };
}

async function countByStatus(
  supabase: SupabaseClient,
  status?: 'Pending' | 'Confirmed' | 'Completed'
): Promise<number> {
  let query = supabase.from('bookings').select('id', { count: 'exact', head: true });
  if (status) {
    query = query.eq('status', status);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function fetchReservationStats(supabase: SupabaseClient): Promise<ReservationStats> {
  const [total, pending, confirmed, completed] = await Promise.all([
    countByStatus(supabase),
    countByStatus(supabase, 'Pending'),
    countByStatus(supabase, 'Confirmed'),
    countByStatus(supabase, 'Completed'),
  ]);

  return { total, pending, confirmed, completed };
}

