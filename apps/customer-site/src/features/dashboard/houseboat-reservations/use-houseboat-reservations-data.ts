import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HouseboatModel, Boat } from '@/lib/types';
import type {
  HouseboatModelPriceRecord,
  HouseboatReservationsState,
  MappedBooking,
  TariffRecord,
} from './types';
import {
  bookingMatchesRealtimeFilters,
  bookingOverlapsRange,
  dedupeBoatsById,
  dedupeBookingsById,
  mapBookingRecord,
} from './calendar-utils';

type ToastFn = (props: { variant?: 'default' | 'destructive'; title: string; description?: string }) => void;

type UseHouseboatReservationsDataArgs = {
  supabase: SupabaseClient | null;
  toast: ToastFn;
  range: { start: Date; end: Date };
  selectedModels: string[];
  selectedStatuses: string[];
  selectedSources: string[];
  searchTerm: string;
};

type UseHouseboatReservationsDataReturn = HouseboatReservationsState & {
  setBookings: Dispatch<SetStateAction<MappedBooking[]>>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  errorMessage: string | null;
};

function normalizeQuerySearchTerm(searchTerm: string) {
  return searchTerm.trim().replace(/[%()]/g, '');
}

export function useHouseboatReservationsData(
  args: UseHouseboatReservationsDataArgs
): UseHouseboatReservationsDataReturn {
  const { supabase, toast, range, selectedModels, selectedStatuses, selectedSources, searchTerm } = args;

  const [houseboatModels, setHouseboatModels] = useState<HouseboatModel[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<MappedBooking[]>([]);
  const [prices, setPrices] = useState<HouseboatModelPriceRecord[]>([]);
  const [tariffs, setTariffs] = useState<TariffRecord[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaticReady, setIsStaticReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStaticData = useCallback(async () => {
    if (!supabase) return;
    try {
      const [modelsRes, pricesRes, tariffsRes, extrasRes] = await Promise.all([
        supabase.from('houseboat_models').select('id, name').order('name', { ascending: true }),
        supabase
          .from('houseboat_prices')
          .select('id, model_id, tariff_id, weekday_price, weekend_price'),
        supabase.from('tariffs').select('id, name, periods'),
        supabase.from('extras').select('id, name, price, type, price_type').in('type', ['all', 'houseboat']),
      ]);

      if (modelsRes.data) {
        setHouseboatModels(modelsRes.data as any);
      }
      if (pricesRes.data) {
        setPrices(pricesRes.data as HouseboatModelPriceRecord[]);
      }
      if (tariffsRes.data) {
        setTariffs(tariffsRes.data as TariffRecord[]);
      }
      if (extrasRes.data) {
        setAvailableExtras(extrasRes.data as any);
      }
      setErrorMessage(null);
      setIsStaticReady(true);
    } catch {
      setErrorMessage('Failed to load fleet configuration.');
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fleet configuration.' });
    }
  }, [supabase, toast]);

  const fetchBoatsForModels = useCallback(async () => {
    if (!supabase) return;
    try {
      let query = supabase.from('boats').select('id, name, model_id').order('name', { ascending: true });
      if (selectedModels.length > 0) {
        query = query.in('model_id', selectedModels);
      }
      const { data } = await query;
      if (data) {
        setBoats(dedupeBoatsById(data as any));
      }
      setErrorMessage(null);
    } catch {
      setErrorMessage('Failed to load fleet units.');
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fleet units.' });
    }
  }, [supabase, selectedModels, toast]);

  const fetchBookingsWindow = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) return;
      if (!options?.silent) setIsLoading(true);

      try {
        let query = supabase
          .from('bookings')
          .select('*')
          .not('houseboat_id', 'is', null)
          .lte('start_time', range.end.toISOString())
          .gte('end_time', range.start.toISOString())
          .order('start_time', { ascending: true });

        if (selectedStatuses.length > 0) {
          query = query.in('status', selectedStatuses);
        }

        if (selectedSources.length > 0) {
          query = query.in('source', selectedSources);
        }

        const normalizedSearch = normalizeQuerySearchTerm(searchTerm);
        if (normalizedSearch) {
          const pattern = `%${normalizedSearch}%`;
          query = query.or(`client_name.ilike.${pattern},client_email.ilike.${pattern},id.ilike.${pattern}`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map(mapBookingRecord);
        setBookings(dedupeBookingsById(mapped));
        setErrorMessage(null);
      } catch {
        setErrorMessage('Failed to load reservations.');
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load reservations.' });
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, range.start, range.end, selectedStatuses, selectedSources, searchTerm, toast]
  );

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) return;
      if (!isStaticReady) {
        await fetchStaticData();
      }
      await Promise.all([fetchBoatsForModels(), fetchBookingsWindow(options)]);
    },
    [supabase, isStaticReady, fetchStaticData, fetchBoatsForModels, fetchBookingsWindow]
  );

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  useEffect(() => {
    fetchBookingsWindow();
  }, [fetchBookingsWindow]);

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        statuses: selectedStatuses.slice().sort(),
        sources: selectedSources.slice().sort(),
        search: searchTerm.trim().toLowerCase(),
      }),
    [selectedStatuses, selectedSources, searchTerm]
  );

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('houseboat-bookings-live-sync')
      .on('postgres_changes', { event: '*', table: 'bookings', schema: 'public' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (!oldId) return;
          setBookings((prev) => prev.filter((b) => b.id !== oldId));
          return;
        }

        const nextRow = payload.eventType === 'INSERT' ? payload.new : payload.new;
        if (!nextRow) return;
        if (!(nextRow as any).houseboat_id) {
          const oldId = (payload.old as any)?.id;
          if (oldId) {
            setBookings((prev) => prev.filter((b) => b.id !== oldId));
          }
          return;
        }

        const mapped = mapBookingRecord(nextRow);
        const isVisible =
          bookingOverlapsRange(mapped, range) &&
          bookingMatchesRealtimeFilters(mapped, selectedStatuses, selectedSources, searchTerm);

        setBookings((prev) => {
          const withoutCurrent = prev.filter((b) => b.id !== mapped.id);
          if (!isVisible) return withoutCurrent;
          return dedupeBookingsById([mapped, ...withoutCurrent]);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, range, filterSignature, selectedStatuses, selectedSources, searchTerm]);

  useEffect(() => {
    fetchBoatsForModels();
  }, [fetchBoatsForModels]);

  return {
    houseboatModels,
    boats,
    bookings,
    prices,
    tariffs,
    availableExtras,
    isLoading,
    errorMessage,
    setBookings,
    refresh,
  };
}
