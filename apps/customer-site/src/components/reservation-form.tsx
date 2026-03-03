'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  MapPin,
  ChevronDown,
  Minus,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const availabilitySchema = z.object({
  guests: z.string().optional(),
  boats: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }),
  bookingType: z.enum(['overnight', 'day_charter']).optional(),
});

interface ReservationFormProps {
  activeTab?: string;
  variant?: 'default' | 'embedded' | 'hero';
}

export default function ReservationForm({ activeTab = 'houseboats', variant = 'default' }: ReservationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const initialTypeParam = searchParams.get('type');
  const initialBookingType: 'overnight' | 'day_charter' =
    activeTab === 'river-cruise'
      ? 'day_charter'
      : (initialTypeParam === 'day_charter' || initialTypeParam === 'overnight'
        ? initialTypeParam
        : 'overnight');
  const [bookingType, setBookingType] = useState<'overnight' | 'day_charter'>(initialBookingType);


  const parseDateParam = (value: string | null) => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  // Default values
  const defaultGuests = searchParams.get('guests') || '2';
  const defaultBoats = searchParams.get('boats') || '1';
  const defaultFrom = parseDateParam(searchParams.get('from'));
  const defaultTo = parseDateParam(searchParams.get('to'));
  const fallbackFrom = addDays(new Date(), 10);
  const fallbackTo = addDays(fallbackFrom, 3);
  const initialFromDate = defaultFrom || fallbackFrom;
  const initialToDate = defaultTo || (defaultFrom ? addDays(defaultFrom, 3) : fallbackTo);

  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      guests: defaultGuests,
      boats: defaultBoats,
      dateRange: {
        from: initialFromDate,
        to: initialToDate,
      },
      bookingType: 'overnight',
    },
  });

  useEffect(() => {
    const currentRange = form.getValues('dateRange');

    if (activeTab === 'river-cruise') {
      if (bookingType !== 'day_charter') {
        setBookingType('day_charter');
      }
      if (currentRange.from) {
        const sameDay = currentRange.to && currentRange.to.getTime() === currentRange.from.getTime();
        if (!sameDay) {
          form.setValue('dateRange', { from: currentRange.from, to: currentRange.from }, { shouldDirty: false });
        }
      }
      return;
    }

    if (activeTab === 'restaurant' && bookingType !== 'overnight') {
      setBookingType('overnight');
      return;
    }

    if (!currentRange.from) return;

    if (bookingType === 'day_charter') {
      const sameDay = currentRange.to && currentRange.to.getTime() === currentRange.from.getTime();
      if (!sameDay) {
        form.setValue('dateRange', { from: currentRange.from, to: currentRange.from }, { shouldDirty: false });
      }
      return;
    }

    const invalidOrMissingCheckout = !currentRange.to || currentRange.to <= currentRange.from;
    if (invalidOrMissingCheckout) {
      form.setValue(
        'dateRange',
        { from: currentRange.from, to: addDays(currentRange.from, 3) },
        { shouldDirty: false }
      );
    }
  }, [activeTab, bookingType, form]);


  async function onAvailabilitySubmit(values: z.infer<typeof availabilitySchema>) {
    setIsSearching(true);
    const { dateRange, guests, boats } = values;
    const params = new URLSearchParams();
    if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
    if (bookingType === 'overnight') {
      const checkoutDate = dateRange.to && dateRange.from && dateRange.to > dateRange.from
        ? dateRange.to
        : (dateRange.from ? addDays(dateRange.from, 3) : undefined);
      if (checkoutDate) params.append('to', checkoutDate.toISOString().split('T')[0]);
    } else if (dateRange.from) {
      params.append('to', dateRange.from.toISOString().split('T')[0]);
    }
    if (guests) params.append('guests', guests);
    if (activeTab === 'houseboats' && boats) params.append('boats', boats);
    params.append('type', bookingType);

    if (activeTab === 'houseboats') {
      router.push(`/houseboats?${params.toString()}`);
    } else if (activeTab === 'river-cruise') {
      router.push(`/river-cruise?${params.toString()}`);
    } else if (activeTab === 'restaurant') {
      router.push(`/restaurant?${params.toString()}`);
    } else {
      router.push(`/contact`);
    }
  }

  const boatsValue = useWatch({ control: form.control, name: 'boats' }) || '1';
  const dateRangeValue = useWatch({ control: form.control, name: 'dateRange' });
  const isEmbedded = variant === 'embedded';
  const isHero = variant === 'hero';
  const hasExplicitDateInput = !!searchParams.get('from') || !!searchParams.get('to');
  const hasPickedDateInUi = !!form.formState.dirtyFields.dateRange;
  const shouldShowChosenDates = hasExplicitDateInput || hasPickedDateInUi;
  const nights = dateRangeValue?.from && dateRangeValue?.to
    ? Math.max(0, differenceInCalendarDays(dateRangeValue.to, dateRangeValue.from))
    : 0;
  const currentGuests = parseInt((useWatch({ control: form.control, name: 'guests' }) || '2'), 10);
  const currentBoats = Math.max(1, parseInt(boatsValue, 10) || 1);

  const updateBookingType = (nextType: 'overnight' | 'day_charter') => {
    if (activeTab === 'river-cruise' && nextType === 'overnight') return;
    setBookingType(nextType);

    const currentRange = form.getValues('dateRange');
    if (!currentRange.from) return;

    if (nextType === 'day_charter') {
      form.setValue('dateRange', { from: currentRange.from, to: currentRange.from }, { shouldDirty: true });
      return;
    }

    const validCheckout = currentRange.to && currentRange.to > currentRange.from
      ? currentRange.to
      : addDays(currentRange.from, 3);
    form.setValue('dateRange', { from: currentRange.from, to: validCheckout }, { shouldDirty: true });
  };

  if (activeTab === 'contact') {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onAvailabilitySubmit)} className="w-full relative">
        <div
          className={cn(
            'relative z-10 rounded-[1.35rem] bg-white',
            isEmbedded
              ? 'p-3 shadow-none'
              : cn('px-4 py-5 md:px-4 md:py-5', isHero ? 'shadow-none' : 'shadow-[0_24px_48px_-34px_rgba(15,23,42,0.55)]')
          )}
        >
          <div className={cn('grid gap-3', isEmbedded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[1.55fr_2.5fr_1.2fr_auto]')}>
              {(activeTab === 'houseboats' || activeTab === 'river-cruise') ? (
                <div className="flex min-h-[66px] items-center gap-2.5 rounded-full bg-[#f3f4f6] px-4 py-2">
                  <span className="px-1 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Stay</span>
                  <button
                    type="button"
                    onClick={() => updateBookingType('overnight')}
                    disabled={activeTab === 'river-cruise'}
                    className={cn(
                      'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.95rem] font-semibold transition-all',
                      bookingType === 'overnight'
                        ? 'bg-[#2b5fd8] text-white'
                        : activeTab === 'river-cruise'
                          ? 'cursor-not-allowed text-slate-300'
                          : 'text-slate-600'
                    )}
                  >
                    Overnight
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBookingType('day_charter')}
                    className={cn(
                      'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.95rem] font-semibold transition-all',
                      bookingType === 'day_charter'
                        ? 'bg-[#2b5fd8] text-white'
                        : 'text-slate-600'
                    )}
                  >
                    Day Charter
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[66px] items-center gap-2.5 rounded-full bg-[#f3f4f6] px-4 py-2">
                  <MapPin className="h-4.5 w-4.5 text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-[0.9rem] leading-tight text-slate-700">Destinations</p>
                    <p className="truncate text-[0.9rem] leading-tight text-slate-500">Search Destinations</p>
                  </div>
                </div>
              )}

              <div className="flex min-h-[66px] items-center rounded-full bg-[#f3f4f6] px-2 py-1.5">
                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-between gap-2.5 rounded-full px-3 py-1.5 text-left transition-colors hover:bg-[#eceef2]"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="leading-none text-[1.65rem] font-medium tabular-nums text-slate-900">
                              {field.value?.from ? format(field.value.from, 'dd') : '--'}
                            </span>
                            <span className="min-w-0">
                              <p className="whitespace-nowrap text-[0.9rem] leading-tight text-slate-800">Check-in</p>
                              <p className="truncate whitespace-nowrap text-[0.9rem] leading-tight text-slate-500">
                                {shouldShowChosenDates && field.value?.from ? format(field.value.from, 'MMM d') : 'Add dates'}
                              </p>
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-500 md:hidden" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border border-slate-200 p-0 shadow-none" align="center">
                        {bookingType === 'day_charter' ? (
                          <CalendarComponent
                            initialFocus
                            mode="single"
                            defaultMonth={field.value?.from}
                            selected={field.value?.from}
                            onSelect={(val: Date | undefined) => field.onChange({ from: val, to: val })}
                            numberOfMonths={2}
                            className="bg-white"
                          />
                        ) : (
                          <CalendarComponent
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={{ from: field.value?.from, to: field.value?.to }}
                            onSelect={(val: DateRange | undefined) => field.onChange({ from: val?.from, to: val?.to })}
                            numberOfMonths={2}
                            className="bg-white"
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                />

                <div className="h-8 w-px bg-slate-300/60" />
                <div className="w-[92px] shrink-0 text-center">
                  <p className="text-[0.82rem] text-slate-400">{bookingType === 'day_charter' ? 'same day' : `${Math.max(1, nights)} nights`}</p>
                </div>
                <div className="h-8 w-px bg-slate-300/60" />

                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          disabled={bookingType === 'day_charter'}
                          className={cn(
                            'flex min-w-0 flex-1 items-center justify-between gap-2.5 rounded-full px-3 py-1.5 text-left transition-colors',
                            bookingType === 'day_charter'
                              ? 'cursor-not-allowed text-slate-400'
                              : 'hover:bg-[#eceef2]'
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className={cn('leading-none text-[1.65rem] font-medium tabular-nums', field.value?.to ? 'text-slate-900' : 'text-slate-400')}>
                              {bookingType === 'day_charter'
                                ? (field.value?.from ? format(field.value.from, 'dd') : '--')
                                : (field.value?.to ? format(field.value.to, 'dd') : '--')}
                            </span>
                            <span className="min-w-0">
                              <p className="whitespace-nowrap text-[0.9rem] leading-tight text-slate-800">Check-out</p>
                              <p className="truncate whitespace-nowrap text-[0.9rem] leading-tight text-slate-500">
                                {bookingType === 'day_charter'
                                  ? (field.value?.from ? format(field.value.from, 'MMM d') : 'Same day')
                                  : (shouldShowChosenDates && field.value?.to ? format(field.value.to, 'MMM d') : 'Add dates')}
                              </p>
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-500 md:hidden" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border border-slate-200 p-0 shadow-none" align="center">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={{ from: field.value?.from, to: field.value?.to }}
                          onSelect={(val: DateRange | undefined) => field.onChange({ from: val?.from, to: val?.to })}
                          numberOfMonths={2}
                          className="bg-white"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-[66px] w-full items-center justify-between gap-2.5 rounded-full bg-[#f3f4f6] px-4 py-2 text-left transition-colors hover:bg-[#eceef2]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="leading-none text-[1.65rem] font-medium tabular-nums text-slate-900">
                            {String(parseInt(field.value || '2', 10)).padStart(2, '0')}
                          </span>
                          <span className="min-w-0">
                            <p className="truncate whitespace-nowrap text-[0.9rem] leading-tight text-slate-800">
                              Guests {Math.max(1, currentGuests)}
                            </p>
                            <p className="truncate whitespace-nowrap text-[0.9rem] leading-tight text-slate-500">
                              {String(currentBoats).padStart(2, '0')} {activeTab === 'houseboats' ? (currentBoats > 1 ? 'boats' : 'boat') : 'room'}
                            </p>
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-500 md:hidden" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(92vw,320px)] border border-slate-200 p-4 shadow-none" align="center">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-slate-700">Guests</span>
                          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-white"
                              onClick={() => field.onChange(Math.max(1, parseInt(field.value || '2', 10) - 1).toString())}
                              disabled={parseInt(field.value || '2', 10) <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center font-semibold text-slate-900">{field.value || '2'}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-white"
                              onClick={() => field.onChange(Math.min(20, parseInt(field.value || '2', 10) + 1).toString())}
                              disabled={parseInt(field.value || '2', 10) >= 20}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {activeTab === 'houseboats' && (
                          <div className="flex items-center justify-between">
                            <span className="text-base font-medium text-slate-700">Boats</span>
                            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white"
                                onClick={() => form.setValue('boats', Math.max(1, parseInt(boatsValue, 10) - 1).toString())}
                                disabled={parseInt(boatsValue, 10) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center font-semibold text-slate-900">{boatsValue}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white"
                                onClick={() => form.setValue('boats', Math.min(5, parseInt(boatsValue, 10) + 1).toString())}
                                disabled={parseInt(boatsValue, 10) >= 5}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              />

              <div className="flex items-center justify-center rounded-full bg-[#f3f4f6] px-2 py-2">
                <Button
                  type="submit"
                  className="h-11 w-full gap-2 rounded-xl bg-[#2b5fd8] text-white hover:bg-[#2558d4] md:h-[50px] md:w-[50px] md:rounded-full md:px-0"
                  disabled={isSearching}
                  aria-label="Search availability"
                >
                  <Search className="h-4 w-4" />
                  <span className="md:hidden">{isSearching ? 'Searching...' : 'Search'}</span>
                </Button>
              </div>
          </div>

        </div>
      </form>
    </Form>
  );
}
