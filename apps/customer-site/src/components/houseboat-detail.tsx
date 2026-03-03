'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachDayOfInterval, differenceInCalendarDays, format, getDay, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  DoorClosed,
  Fuel,
  ShieldCheck,
  Users,
  Waves,
  X,
} from 'lucide-react';

import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { applyHouseboatRecurringDiscount } from '@/lib/booking-rules';

type HouseboatDetailProps = {
  slug: string;
  serverData?: {
    model: any;
    prices: any[];
    units: any[];
    bookings: any[];
  };
  locale: string;
};

type BookingType = 'overnight' | 'day_charter';

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getMaximumBookableGuests(houseboat: any) {
  if (!houseboat) return 10;

  const optimal = toNumber(houseboat.optimal_capacity ?? houseboat.optimalCapacity, 0);
  const maximum = toNumber(houseboat.maximum_capacity ?? houseboat.maximumCapacity, optimal || 10);

  if (optimal > 0) {
    return Math.max(1, Math.min(maximum, optimal + 2));
  }

  return Math.max(1, maximum);
}

function getDynamicTaxesAndFees(priceRow: any, baseAmount: number): number {
  if (!priceRow) return 0;

  const fixedKeys = ['taxes_fees', 'taxes_and_fees', 'tax_fee', 'service_fee', 'fees_total'];
  for (const key of fixedKeys) {
    const value = toNumber(priceRow?.[key], 0);
    if (value > 0) return value;
  }

  const percentKeys = ['tax_percent', 'tax_rate', 'fees_percent', 'service_fee_percent', 'vat_percent'];
  for (const key of percentKeys) {
    const percent = toNumber(priceRow?.[key], 0);
    if (percent > 0) return (baseAmount * percent) / 100;
  }

  return 0;
}

function Lightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const next = useCallback((e?: ReactMouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);
  const prev = useCallback((e?: ReactMouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, onClose, prev]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <Button variant="ghost" className="absolute right-4 top-4 text-white hover:bg-white/10" onClick={onClose}>
        <X className="h-6 w-6" />
      </Button>
      <Button variant="ghost" className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-white hover:bg-white/10" onClick={prev}>
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button variant="ghost" className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-white hover:bg-white/10" onClick={next}>
        <ChevronRight className="h-6 w-6" />
      </Button>
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative aspect-[16/9] w-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image src={images[index]} alt="" fill className="object-contain" priority />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm text-white">
          {index + 1} / {images.length}
        </div>
      </motion.div>
    </motion.div>
  );
}

function money(value: number) {
  return `EUR ${Math.round(value).toLocaleString()}`;
}

function HouseboatDetailContent({ slug: modelId, serverData, locale }: HouseboatDetailProps) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const bookingType: BookingType = searchParams.get('type') === 'day_charter' ? 'day_charter' : 'overnight';

  const [houseboat, setHouseboat] = useState<any | null>(serverData?.model || null);
  const [prices, setPrices] = useState<any[]>(serverData?.prices || []);
  const [isLoading, setIsLoading] = useState(!serverData);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    try {
      if (from && to) return { from: parseISO(from), to: parseISO(to) };
      if (from) {
        const parsed = parseISO(from);
        return bookingType === 'day_charter' ? { from: parsed, to: parsed } : { from: parsed, to: undefined };
      }
    } catch {
      return undefined;
    }
    return undefined;
  });
  const [numGuests, setNumGuests] = useState<number>(() => {
    const parsed = Number.parseInt(searchParams.get('guests') || '2', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
  });
  const [bookingCost, setBookingCost] = useState<{
    total: number;
    weekdayNights: number;
    weekendNights: number;
    weekdayPrice: number;
    weekendPrice: number;
    preparationFee: number;
    deposit: number;
    recurringDiscountPercent: number;
    recurringDiscountAmount: number;
  } | null>(null);

  const getTranslated = (obj: any, field: string, fallback: string) => {
    if (!obj?.translations?.[locale]?.[field]) return fallback;
    return obj.translations[locale][field];
  };

  useEffect(() => {
    if (serverData) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const [{ data: modelData }, { data: pricesData }] = await Promise.all([
          supabase.from('houseboat_models').select('*').eq('id', modelId).single(),
          supabase.from('houseboat_prices').select('*').eq('model_id', modelId),
        ]);
        setHouseboat(modelData);
        setPrices(pricesData || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [modelId, serverData, supabase]);

  const maxBookableGuests = useMemo(() => getMaximumBookableGuests(houseboat), [houseboat]);

  useEffect(() => {
    setNumGuests((current) => {
      if (current < 1) return 1;
      if (current > maxBookableGuests) return maxBookableGuests;
      return current;
    });
  }, [maxBookableGuests]);

  useEffect(() => {
    if (!selectedDateRange?.from || !houseboat) {
      setBookingCost(null);
      return;
    }

    const defaultWeekday = toNumber(prices?.[0]?.weekday_price, toNumber(houseboat?.starting_price, 150));
    const defaultWeekend = toNumber(prices?.[0]?.weekend_price, defaultWeekday);

    if (bookingType === 'day_charter') {
      const total = toNumber(houseboat.diaria_price, defaultWeekday);
      setBookingCost({
        total,
        weekdayNights: 0,
        weekendNights: 0,
        weekdayPrice: defaultWeekday,
        weekendPrice: defaultWeekend,
        preparationFee: 0,
        deposit: Math.ceil(total * 0.3),
        recurringDiscountPercent: 0,
        recurringDiscountAmount: 0,
      });
      return;
    }

    if (!selectedDateRange.to) {
      setBookingCost(null);
      return;
    }

    const nights = differenceInCalendarDays(selectedDateRange.to, selectedDateRange.from);
    if (nights <= 0) {
      setBookingCost(null);
      return;
    }

    let weekdayCount = 0;
    let weekendCount = 0;
    eachDayOfInterval({ start: selectedDateRange.from, end: selectedDateRange.to })
      .slice(0, -1)
      .forEach((day) => {
        const weekday = getDay(day);
        if (weekday === 5 || weekday === 6) weekendCount += 1;
        else weekdayCount += 1;
      });

    const preparationFee = 76;
    const overnightBase = (weekdayCount * defaultWeekday) + (weekendCount * defaultWeekend);
    const recurring = applyHouseboatRecurringDiscount({
      bookingType: 'overnight',
      baseOvernightPrice: overnightBase,
      bookingDate: new Date(),
      checkInDate: selectedDateRange.from,
      guests: numGuests,
      nights,
    });
    const total = recurring.discountedBasePrice + preparationFee;
    setBookingCost({
      total,
      weekdayNights: weekdayCount,
      weekendNights: weekendCount,
      weekdayPrice: defaultWeekday,
      weekendPrice: defaultWeekend,
      preparationFee,
      deposit: Math.ceil(total * 0.3),
      recurringDiscountPercent: recurring.discountPercent,
      recurringDiscountAmount: recurring.discountAmount,
    });
  }, [bookingType, houseboat, numGuests, prices, selectedDateRange]);

  const handleRequestBooking = () => {
    if (!selectedDateRange?.from) {
      toast({ variant: 'destructive', title: 'Select dates first' });
      return;
    }
    if (bookingType === 'overnight' && !selectedDateRange.to) {
      toast({ variant: 'destructive', title: 'Select check-out date' });
      return;
    }
    if (!houseboat) {
      toast({ variant: 'destructive', title: 'Houseboat data not loaded' });
      return;
    }

    const params = new URLSearchParams({
      boatId: houseboat.id,
      from: selectedDateRange.from.toISOString(),
      to: (bookingType === 'day_charter' ? selectedDateRange.from : selectedDateRange.to!).toISOString(),
      guests: numGuests.toString(),
      type: bookingType,
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  if (isLoading) return <HouseboatDetailSkeleton />;
  if (!houseboat) return <div className="min-h-screen p-16 text-center text-xl">Houseboat not found.</div>;

  const images = Array.isArray(houseboat.image_urls)
    ? (houseboat.image_urls as string[])
    : (Array.isArray(houseboat.imageUrls) ? houseboat.imageUrls as string[] : []);
  const galleryImages = images.length > 0 ? images : ['/placeholder-houseboat.jpg'];
  const startingPrice = toNumber(houseboat?.starting_price, toNumber(prices?.[0]?.weekday_price, 150));
  const nightsCount = selectedDateRange?.from && selectedDateRange?.to
    ? Math.max(1, differenceInCalendarDays(selectedDateRange.to, selectedDateRange.from))
    : 1;
  const stayLabel = bookingType === 'day_charter'
    ? 'Day charter'
    : `${nightsCount} night${nightsCount > 1 ? 's' : ''}`;

  const optimalCapacity = toNumber(houseboat.optimal_capacity ?? houseboat.optimalCapacity, 0);
  const maximumCapacity = toNumber(houseboat.maximum_capacity ?? houseboat.maximumCapacity, optimalCapacity || 0);
  const bedrooms = toNumber(houseboat.bedrooms, 0);
  const bathrooms = toNumber(houseboat.bathrooms, 0);
  const kitchens = toNumber(houseboat.kitchens, 0);
  const extraBedGuests = Math.max(0, maxBookableGuests - optimalCapacity);

  const amenities: string[] = Array.isArray(houseboat.amenities) ? houseboat.amenities : [];
  const displayAmenities: string[] = amenities.length > 0
    ? amenities.map((a) => a.replace(/_/g, ' '))
    : ['Sun deck', 'Kitchen equipment', 'Comfortable cabins', 'Panoramic windows', 'Dining area', 'Outdoor seating'];
  const boatDescription =
    getTranslated(houseboat, 'description', houseboat.description) ||
    'Enjoy calm lake days and comfortable nights aboard a fully equipped houseboat designed for easy navigation.';
  const policyCards = [
    {
      title: 'Payment',
      description: 'A 30% deposit confirms the reservation. The remaining amount is paid at check-in.',
      icon: CreditCard,
    },
    {
      title: 'Responsibility Terms',
      description: 'A responsibility term is signed at check-in and only applies in case of damages.',
      icon: ShieldCheck,
    },
    {
      title: 'Fuel',
      description: 'The boat is delivered with full fuel. Consumption during your stay is charged at check-out.',
      icon: Fuel,
    },
    {
      title: 'Check-in and Check-out',
      description: bookingType === 'day_charter'
        ? 'Day-charter timing is confirmed by operations before departure.'
        : 'Check-in and check-out windows are confirmed by marina operations.',
      icon: Clock3,
    },
  ];

  const topFacts = [
    {
      label: 'Ideal capacity',
      value: `${optimalCapacity || '-'} guests`,
      icon: Users,
    },
    {
      label: 'Maximum capacity',
      value: `${maximumCapacity || '-'} guests`,
      icon: Users,
    },
    {
      label: 'Bedrooms',
      value: String(bedrooms),
      icon: BedDouble,
    },
    {
      label: 'Bathrooms',
      value: String(bathrooms),
      icon: Bath,
    },
    {
      label: 'Kitchens',
      value: String(kitchens),
      icon: DoorClosed,
    },
    {
      label: 'Navigation',
      value: 'Licence free',
      icon: Waves,
    },
  ];

  const showExtraBedNotice = optimalCapacity > 0 && numGuests > optimalCapacity && extraBedGuests > 0;
  const selectedExtraBedGuests = showExtraBedNotice
    ? Math.min(numGuests - optimalCapacity, extraBedGuests)
    : 0;
  const weekdaySubtotal = bookingType === 'overnight' && bookingCost
    ? bookingCost.weekdayNights * bookingCost.weekdayPrice
    : 0;
  const weekendSubtotal = bookingType === 'overnight' && bookingCost
    ? bookingCost.weekendNights * bookingCost.weekendPrice
    : 0;
  const preparationSubtotal = bookingCost?.preparationFee || 0;
  const breakdownTotal = bookingCost?.total || startingPrice;
  const breakdownDeposit = bookingCost?.deposit || Math.ceil(breakdownTotal * 0.3);
  const taxesAndFees = Math.max(0, getDynamicTaxesAndFees(
    prices?.[0],
    Math.max(0, weekdaySubtotal + weekendSubtotal + preparationSubtotal),
  ));

  return (
    <>
      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={galleryImages}
            initialIndex={lightboxIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#f6f8fc] pb-24 pt-28 lg:pb-16 lg:pt-32">
        <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Link href="/houseboats" className="inline-flex items-center gap-2 font-medium text-slate-700 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400">Houseboats</span>
            <span className="text-slate-400">/</span>
            <span className="truncate font-semibold text-slate-800">{houseboat.name}</span>
          </div>

          <section className="overflow-hidden rounded-[28px] border border-[#d7deea] bg-white p-4 md:p-6">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f5ecf]">Houseboat model</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-[2.05rem] font-bold leading-[1.02] tracking-tight text-[#1f4ea8] md:text-[2.8rem]">
                  {houseboat.name}
                </h1>
                <span className="rounded-full border border-[#70c167]/40 bg-[#ecf9e6] px-3 py-1.5 text-xs font-semibold text-[#23543f]">
                  No licence required
                </span>
                {showExtraBedNotice && (
                  <span className="rounded-full border border-[#d3dcf0] bg-[#f4f7ff] px-3 py-1.5 text-xs font-semibold text-[#3858ad]">
                    +{selectedExtraBedGuests} guest{selectedExtraBedGuests > 1 ? 's' : ''} with extra bed
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                Private lake stays with easy booking and comfortable cabins.
              </p>
            </div>

            <div className="mt-4 grid gap-3 lg:h-[520px] lg:grid-cols-[1.45fr_1fr]">
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className="relative aspect-[4/3] overflow-hidden rounded-[22px] lg:h-full lg:aspect-auto"
              >
                <Image src={galleryImages[0]} alt={houseboat.name} fill className="object-cover" priority />
              </button>

              <div className="grid grid-cols-2 gap-3 lg:h-full lg:grid-rows-2">
                {[1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openLightbox(idx)}
                    className="relative aspect-[4/3] overflow-hidden rounded-[16px] lg:h-full lg:aspect-auto"
                  >
                    <Image src={galleryImages[idx] || galleryImages[0]} alt="" fill className="object-cover" />
                    {idx === 4 && galleryImages.length > 5 && (
                      <div className="absolute inset-0 flex items-end justify-end bg-black/25 p-3">
                        <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-800">
                          See all {galleryImages.length} photos
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_390px]">
            <main className="space-y-4">
              <section className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-4 md:p-5">
                <h2 className="font-display text-[1.75rem] font-bold tracking-tight text-[#0e1738]">At a glance</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {topFacts.map((fact) => (
                    <div key={fact.label} className="rounded-xl border border-[#dbe3f2] bg-white px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <fact.icon className="h-4 w-4 text-[#2d5fd9]" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fact.label}</p>
                      </div>
                      <p className="mt-1.5 text-base font-semibold leading-none text-[#0e1738]">{fact.value}</p>
                    </div>
                  ))}
                  {displayAmenities.map((item) => (
                    <div key={`amenity-${item}`} className="rounded-xl border border-[#dbe3f2] bg-white px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#2d5fd9]" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Amenity</p>
                      </div>
                      <p className="mt-1.5 text-base font-semibold leading-none capitalize text-[#0e1738]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#d8deea] bg-white p-4 md:p-5">
                <h2 className="font-display text-[1.75rem] font-bold tracking-tight text-[#0e1738]">About this model</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600 md:text-base">{boatDescription}</p>
              </section>

              <section className="rounded-2xl border border-[#d8deea] bg-white p-4 md:p-5">
                <h2 className="font-display text-[1.75rem] font-bold tracking-tight text-[#0e1738]">Before you sail</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {policyCards.map((policy) => (
                    <div key={policy.title} className="rounded-xl border border-[#dbe2f0] bg-[#f8fafe] p-3.5">
                      <div className="flex items-center gap-2">
                        <policy.icon className="h-4 w-4 text-[#2d5fd9]" />
                        <p className="text-base font-semibold text-[#0e1738]">{policy.title}</p>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{policy.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </main>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-[#d5deee] bg-[#eef3fb] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-[1.55rem] font-bold tracking-tight text-[#0e1738]">Price breakdown</p>
                  <span className="rounded-full border border-[#d2ddf4] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#3f5eaa]">
                    {stayLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">Select dates and guests to calculate the final total.</p>

                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="mt-3 w-full rounded-xl border border-[#d8e0ee] bg-white text-left">
                      <div className="grid grid-cols-2">
                        <div className="border-r border-[#e1e7f2] p-2.5">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Check-in</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {selectedDateRange?.from ? format(selectedDateRange.from, 'dd/MM/yyyy') : 'Add date'}
                          </p>
                        </div>
                        <div className="p-2.5">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Check-out</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {bookingType === 'day_charter'
                              ? (selectedDateRange?.from ? format(selectedDateRange.from, 'dd/MM/yyyy') : 'Same day')
                              : (selectedDateRange?.to ? format(selectedDateRange.to, 'dd/MM/yyyy') : 'Add date')}
                          </p>
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border border-[#d8e0ee] p-0 shadow-xl" align="start">
                    {bookingType === 'day_charter' ? (
                      <CalendarPicker
                        mode="single"
                        selected={selectedDateRange?.from}
                        onSelect={(value: Date | undefined) => setSelectedDateRange(value ? { from: value, to: value } : undefined)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    ) : (
                      <CalendarPicker
                        mode="range"
                        selected={selectedDateRange}
                        onSelect={setSelectedDateRange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    )}
                  </PopoverContent>
                </Popover>

                <div className="mt-2.5 rounded-xl border border-[#d8e0ee] bg-white p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Guests</p>
                  <Select value={String(numGuests)} onValueChange={(value) => setNumGuests(Number(value))}>
                    <SelectTrigger className="mt-0.5 h-auto border-none p-0 text-sm font-semibold text-slate-900 shadow-none focus:ring-0">
                      {numGuests} guest{numGuests > 1 ? 's' : ''}
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxBookableGuests }, (_, index) => index + 1).map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value} guest{value > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showExtraBedNotice && (
                    <p className="mt-1.5 text-xs font-medium text-[#3858ad]">
                      Includes +{selectedExtraBedGuests} guest{selectedExtraBedGuests > 1 ? 's' : ''} with extra bed.
                    </p>
                  )}
                </div>

                <div className="mt-2.5 rounded-xl border border-[#d8e0ee] bg-white p-3 text-sm">
                  {bookingType === 'day_charter' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Day charter</span>
                      <span className="font-semibold text-slate-900">{money(bookingCost?.total || toNumber(houseboat.diaria_price, startingPrice))}</span>
                    </div>
                  )}
                  {bookingType === 'overnight' && bookingCost?.weekdayNights ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">
                        {bookingCost.weekdayNights} weeknight{bookingCost.weekdayNights > 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold text-slate-900">{money(weekdaySubtotal)}</span>
                    </div>
                  ) : null}
                  {bookingType === 'overnight' && bookingCost?.weekendNights ? (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-slate-500">
                        {bookingCost.weekendNights} weekend night{bookingCost.weekendNights > 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold text-slate-900">{money(weekendSubtotal)}</span>
                    </div>
                  ) : null}
                  {bookingCost?.recurringDiscountAmount ? (
                    <div className="mt-1.5 flex items-center justify-between text-emerald-700">
                      <span>Permanent offer ({bookingCost.recurringDiscountPercent}% off)</span>
                      <span className="font-semibold">- {money(bookingCost.recurringDiscountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-slate-500">Preparation fee</span>
                    <span className="font-semibold text-slate-900">{money(preparationSubtotal)}</span>
                  </div>
                  {taxesAndFees > 0 && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-slate-500">Taxes and fees</span>
                      <span className="font-semibold text-slate-900">{money(taxesAndFees)}</span>
                    </div>
                  )}
                  <div className="my-2 border-t border-dashed border-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0e1738]">Total amount</span>
                    <span className="font-display text-2xl font-bold leading-none text-[#1f4ea8]">{money(breakdownTotal)}</span>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  Deposit due today: <span className="font-semibold">{money(breakdownDeposit)}</span> (30%)
                </div>

                <Button
                  onClick={handleRequestBooking}
                  className="cta-shimmer mt-3 h-11 w-full rounded-xl text-sm font-semibold text-white"
                  disabled={!selectedDateRange?.from || (bookingType === 'overnight' && !selectedDateRange?.to)}
                >
                  Reserve this houseboat
                </Button>
              </div>
            </aside>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d7deeb] bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs uppercase tracking-[0.14em] text-slate-500">{houseboat.name}</p>
              <p className="font-display text-xl font-bold leading-none text-[#1f4ea8]">{money(breakdownTotal)}</p>
            </div>
            <Button
              onClick={handleRequestBooking}
              className="cta-shimmer h-11 rounded-xl px-5 text-sm font-semibold text-white"
              disabled={!selectedDateRange?.from || (bookingType === 'overnight' && !selectedDateRange?.to)}
            >
              Reserve
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function HouseboatDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-[1320px] space-y-6 px-4 md:px-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-36 rounded-[28px]" />
        <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
          <Skeleton className="aspect-[4/3] rounded-[22px]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-[4/3] rounded-[16px]" />
            <Skeleton className="aspect-[4/3] rounded-[16px]" />
            <Skeleton className="aspect-[4/3] rounded-[16px]" />
            <Skeleton className="aspect-[4/3] rounded-[16px]" />
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function HouseboatDetail({ slug, serverData, locale }: HouseboatDetailProps) {
  return (
    <Suspense fallback={<HouseboatDetailSkeleton />}>
      <HouseboatDetailContent slug={slug} serverData={serverData} locale={locale} />
    </Suspense>
  );
}
