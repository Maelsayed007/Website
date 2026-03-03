'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Minus, Plus, Search, Ship } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/components/providers/supabase-provider';
import HouseboatSearchCard from '@/components/houseboat-search-card';
import PackageCard from '@/components/package-card';
import { Booking, HouseboatModel } from '@/lib/types';
import {
  useBoatPackageGeneration,
  useHouseboatAvailability,
  useHouseboatPricing,
  useHouseboatSearchState,
} from '@/features/houseboats/hooks';

interface HouseboatsContentProps {
  dictionary: any;
  serverData?: {
    models: any[];
    prices: any[];
    units: any[];
    bookings: any[];
  };
  locale: string;
}

export default function HouseboatsContent({ serverData }: HouseboatsContentProps) {
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const router = useRouter();

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const guestsParam = searchParams.get('guests');
  const boatsParam = searchParams.get('boats');
  const typeParam = searchParams.get('type') as 'overnight' | 'day_charter' | null;
  const isSearchMode = !!(fromParam && (typeParam === 'day_charter' ? fromParam : toParam));

  const {
    bookingType,
    setBookingType,
    dateRange,
    setDateRange,
    guests,
    setGuests,
    numberOfBoats,
    setNumberOfBoats,
  } = useHouseboatSearchState({
    fromParam,
    toParam,
    guestsParam,
    boatsParam,
    typeParam,
  });

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const hasMountedRef = useRef(false);

  const [houseboats, setHouseboats] = useState<HouseboatModel[]>(() => {
    if (serverData?.models) {
      return (serverData.models as any[]).map((boat) => ({
        ...boat,
        optimalCapacity: boat.optimal_capacity,
        maximumCapacity: boat.maximum_capacity,
        imageUrls: boat.image_urls,
        singleBeds: boat.single_beds,
        doubleBeds: boat.double_beds,
      }));
    }
    return [];
  });
  const [boatUnits, setBoatUnits] = useState<{ id: string; model_id: string; name: string }[]>(serverData?.units || []);
  const [prices, setPrices] = useState<{ model_id: string; weekday_price: number; weekend_price: number }[]>(serverData?.prices || []);
  const [allBookings, setAllBookings] = useState<Booking[]>(() => {
    if (serverData?.bookings) {
      return (serverData.bookings as any[]).map((b) => ({
        id: b.id,
        clientName: b.client_name,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        source: b.source,
        clientPhone: b.client_phone,
        clientEmail: b.client_email,
        notes: b.notes,
        price: b.price,
        discount: b.discount,
        amount_paid: b.amount_paid,
        payment_status: b.payment_status,
        numberOfGuests: b.number_of_guests,
        houseboatId: b.houseboat_id,
        booking_type: b.booking_type || 'overnight',
      }));
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(!serverData || !serverData.models || serverData.models.length === 0);

  useEffect(() => {
    const hasServerModels = Boolean(serverData?.models && serverData.models.length > 0);
    if (hasServerModels) {
      setIsLoading(false);
      return;
    }

    if (!supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      const [modelsRes, pricesRes, unitsRes] = await Promise.all([
        supabase.from('houseboat_models').select('*'),
        supabase.from('houseboat_prices').select('*'),
        supabase.from('boats').select('id, model_id, name'),
      ]);

      if (modelsRes.data) {
        const mappedBoats = (modelsRes.data as any[]).map((boat) => ({
          ...boat,
          optimalCapacity: boat.optimal_capacity,
          maximumCapacity: boat.maximum_capacity,
          imageUrls: boat.image_urls,
          singleBeds: boat.single_beds,
          doubleBeds: boat.double_beds,
        }));
        setHouseboats(mappedBoats);
      }
      if (pricesRes.data) setPrices(pricesRes.data as any);
      if (unitsRes.data) setBoatUnits(unitsRes.data as any);

      if (isSearchMode) {
        const { data: bookings } = await supabase.from('bookings').select('*').gte('end_time', new Date().toISOString());
        if (bookings) {
          const mappedBookings = (bookings as any[]).map((b) => ({
            id: b.id,
            clientName: b.client_name,
            startTime: b.start_time,
            endTime: b.end_time,
            status: b.status,
            source: b.source,
            clientPhone: b.client_phone,
            clientEmail: b.client_email,
            notes: b.notes,
            price: b.price,
            discount: b.discount,
            amount_paid: b.amount_paid,
            payment_status: b.payment_status,
            numberOfGuests: b.number_of_guests,
            houseboatId: b.houseboat_id,
            booking_type: b.booking_type || 'overnight',
          }));
          setAllBookings(mappedBookings);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [supabase, isSearchMode, serverData]);

  const { pricingByModelId } = useHouseboatPricing({
    houseboats,
    prices,
    bookingType,
    dateRange,
    isSearchMode,
  });

  const { processedHouseboats, guestWarning } = useHouseboatAvailability({
    houseboats,
    boatUnits,
    allBookings,
    bookingType,
    dateRange,
    guests,
    isSearchMode,
    numberOfBoats,
    pricingByModelId,
  });

  const { generatedPackages } = useBoatPackageGeneration({
    numberOfBoats,
    isSearchMode,
    guests,
    processedHouseboats,
    boatUnits,
    allBookings,
    dateRange,
  });

  const buildSearchParams = useCallback(() => {
    if (!dateRange?.from || (bookingType === 'overnight' && !dateRange?.to)) {
      return null;
    }

    const params = new URLSearchParams();
    params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    if (bookingType === 'overnight' && dateRange.to) {
      params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    } else {
      params.set('to', format(dateRange.from, 'yyyy-MM-dd'));
    }
    params.set('guests', guests);
    params.set('boats', numberOfBoats.toString());
    params.set('type', bookingType);
    return params;
  }, [bookingType, dateRange, guests, numberOfBoats]);

  const handleSearch = () => {
    const params = buildSearchParams();
    if (!params) return;
    router.push(`/houseboats?${params.toString()}`);
  };

  const handleClear = () => {
    setDateRange(undefined);
    setGuests('2');
    setNumberOfBoats(1);
    setBookingType('overnight');
    router.push('/houseboats');
  };

  const availableModelCount = processedHouseboats.length;
  const availabilityLabel = `${availableModelCount} ${availableModelCount === 1 ? 'model' : 'models'} available`;
  const isFiltered = !!dateRange?.from || parseInt(guests) !== 2 || numberOfBoats !== 1 || isSearchMode;

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current || !isSearchMode) return;

    const currentGuests = searchParams.get('guests') || '';
    const currentBoats = searchParams.get('boats') || '';
    if (currentGuests === guests && currentBoats === String(numberOfBoats)) {
      return;
    }

    const params = buildSearchParams();
    if (!params) return;

    const timeout = setTimeout(() => {
      router.replace(`/houseboats?${params.toString()}`, { scroll: false });
    }, 220);

    return () => clearTimeout(timeout);
  }, [guests, numberOfBoats, isSearchMode, searchParams, router, buildSearchParams]);

  return (
    <div className="min-h-screen bg-white pt-[70px]">
      <section className="border-b border-slate-200 bg-[#f6f8fc]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Houseboat stays</p>
              <h1 className="mt-2 text-3xl font-display font-bold tracking-tight text-[#0e1738] md:text-5xl">
                Find your private lake stay
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                Choose your model, set your dates, and reserve with a smooth booking flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {availabilityLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto min-h-[60vh] px-4 py-6 md:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4 lg:hidden">
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Search and filters</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{bookingType === 'overnight' ? 'Overnight stay' : 'Day charter'}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{availabilityLabel}</span>
            </button>

            {isSearchExpanded && (
              <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={bookingType === 'overnight' ? 'default' : 'outline'}
                    className={cn(
                      'h-10 border text-xs font-bold',
                      bookingType === 'overnight'
                        ? 'border-[#2b5fd8] bg-[#2b5fd8] text-white hover:bg-[#2452bd]'
                        : 'border-slate-300 bg-white text-slate-700'
                    )}
                    onClick={() => setBookingType('overnight')}
                  >
                    Overnight
                  </Button>
                  <Button
                    type="button"
                    variant={bookingType === 'day_charter' ? 'default' : 'outline'}
                    className={cn(
                      'h-10 border text-xs font-bold',
                      bookingType === 'day_charter'
                        ? 'border-[#2b5fd8] bg-[#2b5fd8] text-white hover:bg-[#2452bd]'
                        : 'border-slate-300 bg-white text-slate-700'
                    )}
                    onClick={() => setBookingType('day_charter')}
                  >
                    Day Charter
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {bookingType === 'overnight' ? 'Check-in' : 'Charter date'}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-start border-slate-300 text-left font-semibold text-slate-700"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                        {dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-none" align="start">
                      {bookingType === 'overnight' ? (
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          disabled={(date) => date < subDays(new Date(), 0)}
                          className="rounded-xl bg-white"
                        />
                      ) : (
                        <Calendar
                          mode="single"
                          selected={dateRange?.from}
                          onSelect={(val: any) => setDateRange({ from: val, to: val })}
                          numberOfMonths={1}
                          disabled={(date) => date < subDays(new Date(), 0)}
                          className="rounded-xl bg-white"
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {bookingType === 'overnight' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full justify-start border-slate-300 text-left font-semibold text-slate-700"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                          {dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Select check-out'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-none" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          disabled={(date) => date < new Date()}
                          className="rounded-xl bg-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Guests</Label>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-slate-300 px-2">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => {
                          const current = parseInt(guests) || 0;
                          setGuests(Math.max(0, current - 1).toString());
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-bold text-slate-900">{guests}</span>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => {
                          const current = parseInt(guests) || 0;
                          setGuests(Math.min(100, current + 1).toString());
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Boats</Label>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-slate-300 px-2">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => setNumberOfBoats(Math.max(1, numberOfBoats - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-bold text-slate-900">{numberOfBoats}</span>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => setNumberOfBoats(Math.min(5, numberOfBoats + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {guestWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {guestWarning}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-slate-300 text-xs font-bold text-slate-700"
                    onClick={() => {
                      handleClear();
                      setIsSearchExpanded(false);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="cta-shimmer h-10 rounded-xl text-xs font-bold text-white"
                    onClick={() => {
                      handleSearch();
                      setIsSearchExpanded(false);
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-[82px] rounded-2xl border border-slate-200 bg-[#f8fbff] p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#2b5fd8]" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Alqueva Lake</p>
                </div>
                <h2 className="mt-1.5 text-base font-display font-bold text-[#0e1738]">Search and filters</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Dates, guests, and boats.</p>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={bookingType === 'overnight' ? 'default' : 'outline'}
                    className={cn(
                      'h-8 border text-[11px] font-bold',
                      bookingType === 'overnight'
                        ? 'border-[#2b5fd8] bg-[#2b5fd8] text-white hover:bg-[#2452bd]'
                        : 'border-slate-300 bg-white text-slate-700'
                    )}
                    onClick={() => setBookingType('overnight')}
                  >
                    Overnight
                  </Button>
                  <Button
                    type="button"
                    variant={bookingType === 'day_charter' ? 'default' : 'outline'}
                    className={cn(
                      'h-8 border text-[11px] font-bold',
                      bookingType === 'day_charter'
                        ? 'border-[#2b5fd8] bg-[#2b5fd8] text-white hover:bg-[#2452bd]'
                        : 'border-slate-300 bg-white text-slate-700'
                    )}
                    onClick={() => setBookingType('day_charter')}
                  >
                    Day Charter
                  </Button>
                </div>

                <div className="mt-2.5 space-y-2.5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {bookingType === 'overnight' ? 'Check-in' : 'Charter date'}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full justify-start border-slate-300 text-left font-semibold text-slate-700"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                          {dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-none" align="start">
                        {bookingType === 'overnight' ? (
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            disabled={(date) => date < subDays(new Date(), 0)}
                            className="rounded-xl bg-white"
                          />
                        ) : (
                          <Calendar
                            mode="single"
                            selected={dateRange?.from}
                            onSelect={(val: any) => setDateRange({ from: val, to: val })}
                            numberOfMonths={1}
                            disabled={(date) => date < subDays(new Date(), 0)}
                            className="rounded-xl bg-white"
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {bookingType === 'overnight' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Check-out</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-full justify-start border-slate-300 text-left font-semibold text-slate-700"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                            {dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Select check-out'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-none" align="start">
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            disabled={(date) => date < new Date()}
                            className="rounded-xl bg-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Guests</Label>
                      <div className="flex h-10 items-center justify-between rounded-xl border border-slate-300 px-2">
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => {
                            const current = parseInt(guests) || 0;
                            setGuests(Math.max(0, current - 1).toString());
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-900">{guests}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => {
                            const current = parseInt(guests) || 0;
                            setGuests(Math.min(100, current + 1).toString());
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Boats</Label>
                      <div className="flex h-10 items-center justify-between rounded-xl border border-slate-300 px-2">
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => setNumberOfBoats(Math.max(1, numberOfBoats - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-900">{numberOfBoats}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => setNumberOfBoats(Math.min(5, numberOfBoats + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {guestWarning && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {guestWarning}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="h-9 rounded-xl border-slate-300 text-[12px] font-semibold text-slate-700 hover:bg-white"
                    disabled={!isFiltered}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleSearch}
                    className="cta-shimmer h-9 rounded-xl text-[12px] font-bold text-white"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </aside>

            <div>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[220px] w-full rounded-2xl bg-gray-200" />
                  ))}
                </div>
              ) : numberOfBoats > 1 && generatedPackages.length > 0 ? (
                <>
                  <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-[#0e1738]">Curated Fleet Combinations</h2>
                      <p className="mt-1 text-slate-600">
                        {generatedPackages.length} options prepared for your selected dates and group size.
                      </p>
                      <p className="mt-2 rounded-xl border border-[#2b5fd8]/20 bg-[#eef3ff] px-3 py-2 text-sm font-medium text-[#1f4ea8]">
                        You selected more than one boat. We show best-fit boat combinations instead of single-boat cards.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {availabilityLabel}
                    </span>
                  </div>
                  <div className="space-y-5 pb-20">
                    {generatedPackages.map((pkg, idx) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        index={idx}
                        dateRange={dateRange}
                        guests={guests}
                      />
                    ))}
                  </div>
                </>
              ) : numberOfBoats > 1 && generatedPackages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20">
                  <div className="mb-4 rounded-full bg-[#eef3ff] p-4">
                    <Ship className="h-10 w-10 text-[#2b5fd8]" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-[#0e1738]">No matching fleet combination yet</h3>
                  <p className="mb-6 mt-2 max-w-md text-center text-slate-600">
                    Try reducing the number of boats or selecting another date window.
                  </p>
                  <Button
                    onClick={() => setNumberOfBoats(Math.max(1, numberOfBoats - 1))}
                    className="cta-shimmer h-12 rounded-xl px-6 font-bold text-white transition-all"
                  >
                    Try {Math.max(1, numberOfBoats - 1)} Boats
                  </Button>
                </div>
              ) : processedHouseboats.length > 0 ? (
                <>
                  <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-[#0e1738]">Available Houseboat Models</h2>
                      <p className="mt-1 text-slate-600">One clear view per model with detailed capacity and layout information.</p>
                    </div>
                    {isFiltered && (
                      <Button
                        variant="outline"
                        onClick={handleClear}
                        className="h-10 w-fit rounded-xl border-slate-300 px-4 font-semibold text-slate-700 hover:bg-white"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                  <div className="space-y-5 pb-20">
                    {processedHouseboats.map((boat) => (
                      <HouseboatSearchCard
                        key={boat.id}
                        boat={boat}
                        requestedGuests={parseInt(guests) || 2}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20">
                  <div className="mb-4 rounded-full bg-[#eef3ff] p-4">
                    <Search className="h-10 w-10 text-[#2b5fd8]" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-[#0e1738]">No models match these dates yet</h3>
                  <p className="mb-6 mt-2 text-center text-lg text-slate-600">Adjust dates or guest count to explore more options.</p>
                  <Button onClick={handleClear} className="cta-shimmer h-12 rounded-xl px-6 font-bold text-white transition-all">
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
