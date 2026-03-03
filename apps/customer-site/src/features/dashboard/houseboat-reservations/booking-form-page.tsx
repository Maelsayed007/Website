'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Booking, Boat, HouseboatModel } from '@/lib/types';
import { mapBookingRecord } from './calendar-utils';
import { BookingFormSheet } from './booking-form-sheet';

type BookingFormPageProps = {
  mode: 'new' | 'edit';
  bookingId?: string;
};

type HouseboatModelPriceRecord = {
  model_id: string;
  tariff_id: string;
  weekday_price: number;
  weekend_price: number;
};

type TariffRecord = {
  id: string;
  name: string;
  periods?: Array<{ start: string; end: string }>;
};

type ExtraRecord = {
  id: string;
  name: string;
  price?: number;
  price_type?: string;
};

function parseDateParam(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function BookingFormPage({ mode, bookingId }: BookingFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const [models, setModels] = useState<HouseboatModel[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [prices, setPrices] = useState<HouseboatModelPriceRecord[]>([]);
  const [tariffs, setTariffs] = useState<TariffRecord[]>([]);
  const [extras, setExtras] = useState<ExtraRecord[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const preselectedDate = useMemo(
    () => parseDateParam(searchParams.get('startDate')),
    [searchParams]
  );
  const preselectedEndDate = useMemo(
    () => parseDateParam(searchParams.get('endDate')),
    [searchParams]
  );
  const preselectedBoatId = searchParams.get('boatId') || undefined;
  const preselectedSlot = (searchParams.get('startSlot') as 'AM' | 'PM' | null) || undefined;
  const preselectedEndSlot = (searchParams.get('endSlot') as 'AM' | 'PM' | null) || undefined;

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [modelsRes, boatsRes, pricesRes, tariffsRes, extrasRes, bookingRes] = await Promise.all([
          supabase.from('houseboat_models').select('*').order('name', { ascending: true }),
          supabase.from('boats').select('id, name, model_id').order('name', { ascending: true }),
          supabase.from('houseboat_prices').select('model_id, tariff_id, weekday_price, weekend_price'),
          supabase.from('tariffs').select('id, name, periods'),
          supabase.from('extras').select('id, name, price, price_type').in('type', ['all', 'houseboat']),
          mode === 'edit' && bookingId
            ? supabase.from('bookings').select('*').eq('id', bookingId).single()
            : Promise.resolve({ data: null, error: null } as any),
        ]);

        if (!isMounted) return;
        if (modelsRes.error || boatsRes.error || pricesRes.error || tariffsRes.error || extrasRes.error) {
          throw new Error('Failed to load reservation form data.');
        }

        setModels((modelsRes.data || []) as HouseboatModel[]);
        setBoats((boatsRes.data || []) as Boat[]);
        setPrices((pricesRes.data || []) as HouseboatModelPriceRecord[]);
        setTariffs((tariffsRes.data || []) as TariffRecord[]);
        setExtras((extrasRes.data || []) as ExtraRecord[]);

        if (mode === 'edit' && bookingId) {
          if (bookingRes?.error) throw bookingRes.error;
          const mapped = mapBookingRecord(bookingRes.data);
          setBooking(mapped as Booking);
        } else {
          setBooking(null);
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error?.message || 'Unable to load reservation form.',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [supabase, toast, mode, bookingId]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      const shouldDiscard = window.confirm('You have unsaved changes. Discard and leave this page?');
      if (!shouldDiscard) return;
    }
    router.push('/dashboard/houseboat-reservations');
  }, [isDirty, router]);

  const handleSave = useCallback(
    async (
      bookingData: Partial<Booking> & { selectedExtras?: string[] },
      options?: { closeAfterSave?: boolean }
    ) => {
      const method = bookingData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || 'Failed to save reservation.');
      }

      toast({ title: 'Saved', description: 'Reservation updated successfully.' });
      if (options?.closeAfterSave ?? true) {
        router.push('/dashboard/houseboat-reservations');
      }
    },
    [router, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!booking?.id) return;
    const confirmed = window.confirm('Delete this reservation permanently?');
    if (!confirmed) return;

    const response = await fetch(`/api/bookings?id=${booking.id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete reservation.' });
      return;
    }
    toast({ title: 'Deleted', description: 'Reservation removed successfully.' });
    router.push('/dashboard/houseboat-reservations');
  }, [booking?.id, router, toast]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Card className="flex min-h-[60vh] items-center justify-center border border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reservation form...
          </div>
        </Card>
      </div>
    );
  }

  if (mode === 'edit' && !booking) {
    return (
      <div className="p-6">
        <Card className="flex min-h-[60vh] flex-col items-center justify-center gap-3 border border-border bg-card p-6 text-center">
          <p className="text-base font-semibold text-foreground">Reservation not found.</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/houseboat-reservations')}>
            Back to calendar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Card className="mx-auto h-[calc(100vh-8rem)] max-w-5xl overflow-hidden border border-border bg-card">
        <BookingFormSheet
          mode="full"
          booking={booking}
          boats={boats}
          models={models}
          prices={prices}
          tariffs={tariffs}
          availableExtras={extras}
          preselectedBoatId={preselectedBoatId}
          preselectedDate={preselectedDate}
          preselectedSlot={preselectedSlot}
          preselectedEndDate={preselectedEndDate}
          preselectedEndSlot={preselectedEndSlot}
          onDirtyChange={setIsDirty}
          onClose={handleBack}
          onSave={handleSave}
          onDelete={mode === 'edit' ? handleDelete : undefined}
        />
      </Card>
    </div>
  );
}
