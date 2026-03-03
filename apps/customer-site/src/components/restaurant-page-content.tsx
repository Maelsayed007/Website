'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock3, Loader2, Mail, PhoneCall, Star, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/components/app-layout';
import { useSupabase } from '@/components/providers/supabase-provider';
import { cn } from '@/lib/utils';
import {
  getAvailabilityReasonText,
  getDefaultRestaurantDateString,
  isRestaurantClosedDay,
  normalizeQuickDraft,
  RESTAURANT_DEFAULT_GUESTS,
  RESTAURANT_TIME_OPTIONS,
  RestaurantAvailabilityPayload,
  RestaurantMenuOption,
  RestaurantQuickDraft,
  toInputDate,
} from './restaurant-booking.types';

interface RestaurantPageContentProps {
  dictionary: any;
  serverMenus?: RestaurantMenuOption[];
  locale: string;
}

function getTranslated(item: any, locale: string, field: string, fallback: string) {
  return item?.translations?.[locale]?.[field] || fallback;
}

export default function RestaurantPageContent({ dictionary: _dictionary, serverMenus, locale }: RestaurantPageContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { websiteSettings } = useAppContext();
  const { supabase } = useSupabase();

  const [menus, setMenus] = useState<RestaurantMenuOption[]>(() =>
    (serverMenus || []).map((menu) => ({
      ...menu,
      price_senior: menu.price_senior || menu.price_adult || 0,
    })),
  );
  const [isMenusLoading, setIsMenusLoading] = useState(!serverMenus || serverMenus.length === 0);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<RestaurantAvailabilityPayload | null>(null);

  const [quickDraft, setQuickDraft] = useState<RestaurantQuickDraft>(() =>
    normalizeQuickDraft({ menuId: serverMenus?.[0]?.id }, serverMenus?.[0]?.id || ''),
  );

  useEffect(() => {
    if (serverMenus && serverMenus.length > 0) {
      setIsMenusLoading(false);
      return;
    }
    if (!supabase) return;

    let mounted = true;
    const fetchMenus = async () => {
      setIsMenusLoading(true);
      try {
        const { data } = await supabase
          .from('restaurant_menus')
          .select('id, name, description, price_adult, price_child, price_senior, is_active, sort_order, translations')
          .eq('is_active', true)
          .order('sort_order');

        if (!mounted) return;
        const mapped = (data || []).map(
          (menu: any) =>
            ({
              ...menu,
              price_senior: menu.price_senior || menu.price_adult || 0,
            }) as RestaurantMenuOption,
        );
        setMenus(mapped);
      } catch {
        if (!mounted) return;
        setMenus([]);
      } finally {
        if (mounted) setIsMenusLoading(false);
      }
    };

    fetchMenus();
    return () => {
      mounted = false;
    };
  }, [serverMenus, supabase]);

  useEffect(() => {
    if (!menus.length) return;
    if (quickDraft.menuId) return;
    setQuickDraft((current) =>
      normalizeQuickDraft(
        {
          ...current,
          menuId: menus[0].id,
        },
        menus[0].id,
      ),
    );
  }, [menus, quickDraft.menuId]);

  const heroImage = websiteSettings?.restaurantHeroImageUrl || '/boat-hero.jpg';
  const defaultDate = quickDraft.date || getDefaultRestaurantDateString();
  const selectedDate = new Date(`${defaultDate}T00:00:00`);
  const totalGuests = quickDraft.adults + quickDraft.children + quickDraft.seniors;

  const quickMenuOptions = useMemo(
    () =>
      menus.map((menu) => ({
        id: menu.id,
        label: getTranslated(menu, locale, 'name', menu.name),
      })),
    [menus, locale],
  );

  const handlePartySizeChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    const nextGuests = Number.isFinite(parsed) && parsed > 0 ? parsed : RESTAURANT_DEFAULT_GUESTS;
    setQuickDraft((current) => ({
      ...current,
      adults: nextGuests,
      children: 0,
      seniors: 0,
    }));
    setAvailability(null);
  };

  const handleTimeChange = (time: string) => {
    setQuickDraft((current) => ({
      ...current,
      time,
    }));
    setAvailability(null);
  };

  const buildReserveQuery = (draft: RestaurantQuickDraft) => {
    const params = new URLSearchParams();
    params.set('menuId', draft.menuId);
    params.set('date', draft.date);
    params.set('time', draft.time);
    params.set('adults', String(draft.adults));
    params.set('children', String(draft.children));
    params.set('seniors', String(draft.seniors));
    return params.toString();
  };

  const handleCheckAvailability = async (draftOverride?: RestaurantQuickDraft) => {
    const draft = draftOverride || quickDraft;
    const draftGuestCount = draft.adults + draft.children + draft.seniors;

    if (!menus.length) {
      toast({
        variant: 'destructive',
        title: 'Menus are still loading',
        description: 'Please wait a moment and try again.',
      });
      return;
    }

    if (!draft.menuId) {
      toast({ variant: 'destructive', title: 'Please select a menu first.' });
      return;
    }

    if (!draft.date || !draft.time || draftGuestCount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Missing reservation details',
        description: 'Select date, time, and party size to continue.',
      });
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const res = await fetch('/api/public/restaurant/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: draft.date,
          time: draft.time,
          partySize: draftGuestCount,
        }),
      });
      const payload = (await res.json()) as RestaurantAvailabilityPayload;
      setAvailability(payload);

      if (!payload.available) {
        toast({
          variant: 'destructive',
          title: 'Selected slot unavailable',
          description: getAvailabilityReasonText(payload.reason),
        });
        return;
      }

      router.push(`/restaurant/reserve?${buildReserveQuery(draft)}`);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Availability check failed',
        description: 'Please try again.',
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f5f7] pb-16">
      <section className="relative h-[330px] overflow-hidden md:h-[430px]">
        <Image src={heroImage} alt="Amieira Marina Restaurant" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/24" />
        <button
          type="button"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white"
        >
          See restaurant photos
        </button>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div>
            <h1 className="font-display text-[2.5rem] font-bold tracking-tight text-[#1e2432] md:text-[3rem]">
              Amieira Marina Restaurant
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[1.02rem] text-slate-700">
              <span className="inline-flex items-center gap-1 font-semibold text-[#79ab64]">
                <Star className="h-4 w-4 fill-current" />
                4.8
              </span>
              <span className="text-slate-500">(lakefront dining)</span>
              <span className="text-slate-400">&middot;</span>
              <span>Portuguese and Mediterranean</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-7 border-b border-[#d7dce6] pb-2 text-[1.03rem] font-medium text-slate-600">
              <button type="button" className="border-b-2 border-[#79ab64] pb-2 text-[#5f9150]">
                Overview
              </button>
              <button type="button">Menus</button>
              <button type="button">Events</button>
              <button type="button">Contact</button>
            </div>

            <section className="pt-6">
              <h2 className="text-3xl font-bold tracking-tight text-[#1f2737]">About this restaurant</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#d8e6d1] bg-[#f4f9f1] px-4 py-1.5 text-sm font-semibold text-[#5f9150]">Lakefront</span>
                <span className="rounded-full border border-[#d8e6d1] bg-[#f4f9f1] px-4 py-1.5 text-sm font-semibold text-[#5f9150]">Good for groups</span>
                <span className="rounded-full border border-[#d8e6d1] bg-[#f4f9f1] px-4 py-1.5 text-sm font-semibold text-[#5f9150]">Special occasions</span>
              </div>
              <p className="mt-4 max-w-3xl text-[1.02rem] leading-8 text-slate-700">
                Enjoy calm lake views, fresh regional ingredients, and a friendly atmosphere built for families, celebrations, and group meals.
                Reserve your preferred menu and timing in a few steps, then complete confirmation securely online.
              </p>
            </section>

            <section className="pt-10">
              <h2 className="text-3xl font-bold tracking-tight text-[#1f2737]">Menus</h2>
              {isMenusLoading ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-[240px] rounded-2xl" />
                  ))}
                </div>
              ) : menus.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#cfd8e6] bg-white px-6 py-12 text-center text-slate-500">
                  Menus are not available right now. Please try again shortly.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {menus.map((menu) => {
                    const translatedName = getTranslated(menu, locale, 'name', menu.name);
                    const translatedDescription = getTranslated(
                      menu,
                      locale,
                      'description',
                      menu.description || 'Balanced menu selection prepared for lakefront dining.',
                    );

                    return (
                      <article key={menu.id} className="rounded-2xl border border-[#d9deea] bg-white p-4">
                        <h3 className="truncate text-[1.65rem] font-bold tracking-tight text-[#1d2636]">{translatedName}</h3>
                        <p className="mt-1 truncate text-sm text-slate-600">{translatedDescription}</p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-lg border border-[#e1e6f1] bg-[#f7f9fc] px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Child</p>
                            <p className="whitespace-nowrap text-sm font-semibold text-[#1d2636]">EUR {menu.price_child}</p>
                          </div>
                          <div className="rounded-lg border border-[#e1e6f1] bg-[#f7f9fc] px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Adult</p>
                            <p className="whitespace-nowrap text-sm font-semibold text-[#1d2636]">EUR {menu.price_adult}</p>
                          </div>
                          <div className="rounded-lg border border-[#e1e6f1] bg-[#f7f9fc] px-2 py-2 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Senior</p>
                            <p className="whitespace-nowrap text-sm font-semibold text-[#1d2636]">EUR {menu.price_senior}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const nextDraft = { ...quickDraft, menuId: menu.id };
                            setQuickDraft(nextDraft);
                            setAvailability(null);
                            void handleCheckAvailability(nextDraft);
                          }}
                          className="mt-4 h-10 w-full rounded-xl border border-[#79ab64]/35 bg-[#f4f9f1] text-sm font-semibold text-[#5f9150] hover:bg-[#ebf5e6]"
                        >
                          Reserve this menu
                        </Button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="pt-10">
              <div className="rounded-2xl border border-[#d9deea] bg-white p-6">
                <h2 className="text-3xl font-bold tracking-tight text-[#1f2737]">Custom events and groups</h2>
                <p className="mt-3 text-[1.02rem] leading-8 text-slate-700">
                  Birthdays, anniversaries, and private events can be organized with tailored menu options and dedicated support.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button asChild className="h-10 rounded-xl border-none bg-[#79ab64] px-5 text-sm font-semibold text-white hover:bg-[#6d9b58]">
                    <Link href="/contact?requestType=restaurant_group">Request custom event</Link>
                  </Button>
                  <a href="tel:+351934343567" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d2d8e7] bg-white px-4 text-sm font-semibold text-[#5f9150]">
                    <PhoneCall className="h-4 w-4" />
                    +351934343567
                  </a>
                  <a href="mailto:geral@amieiramarina.com" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d2d8e7] bg-white px-4 text-sm font-semibold text-[#5f9150]">
                    <Mail className="h-4 w-4" />
                    geral@amieiramarina.com
                  </a>
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#d8dde8] bg-white p-5">
              <h2 className="text-center text-[2rem] font-bold tracking-tight text-[#262e3b]">Make a reservation</h2>

              <div className="mt-4 space-y-2.5">
                <label className="block">
                  <span className="sr-only">Menu</span>
                  <select
                    value={quickDraft.menuId}
                    onChange={(event) => {
                      setQuickDraft((current) => ({
                        ...current,
                        menuId: event.target.value,
                      }));
                      setAvailability(null);
                    }}
                    className="h-12 w-full rounded-md border border-[#e2e5ec] bg-[#f1f3f7] px-3 text-base font-semibold text-[#2b3342] outline-none"
                    disabled={isMenusLoading || quickMenuOptions.length === 0}
                  >
                    {quickMenuOptions.length === 0 ? (
                      <option value="">No menus available</option>
                    ) : (
                      quickMenuOptions.map((menuOption) => (
                        <option key={menuOption.id} value={menuOption.id}>
                          {menuOption.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="sr-only">People</span>
                  <select
                    value={totalGuests}
                    onChange={(event) => handlePartySizeChange(event.target.value)}
                    className="h-12 w-full rounded-md border border-[#e2e5ec] bg-[#f1f3f7] px-3 text-base font-semibold text-[#2b3342] outline-none"
                  >
                    {Array.from({ length: 20 }, (_, index) => index + 1).map((guestCount) => (
                      <option key={guestCount} value={guestCount}>
                        {guestCount} people
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-12 items-center justify-between rounded-md border border-[#e2e5ec] bg-[#f1f3f7] px-3 text-base font-semibold text-[#2b3342]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-[#5f9150]" />
                          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-xl border border-[#d8deea] p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setQuickDraft((current) => ({ ...current, date: toInputDate(date) }));
                          setAvailability(null);
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0)) || isRestaurantClosedDay(date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <label className="block">
                    <span className="sr-only">Time</span>
                    <select
                      value={quickDraft.time}
                      onChange={(event) => handleTimeChange(event.target.value)}
                      className="h-12 w-full rounded-md border border-[#e2e5ec] bg-[#f1f3f7] px-3 text-base font-semibold text-[#2b3342] outline-none"
                    >
                      {RESTAURANT_TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="text-lg font-semibold text-[#2b3342]">Select a time</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {RESTAURANT_TIME_OPTIONS.slice(0, 6).map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleTimeChange(time)}
                        className={cn(
                          'h-10 rounded-md text-sm font-semibold',
                          quickDraft.time === time ? 'bg-[#79ab64] text-white' : 'border border-[#e1e5ef] bg-white text-[#2d3445]',
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {availability && (
                  <div
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-semibold',
                      availability.available ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800',
                    )}
                  >
                    {getAvailabilityReasonText(availability.reason)}
                  </div>
                )}

                <p className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-[#5f9150]" />
                  Guest count selected: {totalGuests}
                </p>

                <Button
                  type="button"
                  onClick={() => {
                    void handleCheckAvailability();
                  }}
                  className="h-11 w-full rounded-md border-none bg-[#79ab64] text-base font-semibold text-white hover:bg-[#6d9b58]"
                  disabled={isCheckingAvailability || isMenusLoading || !menus.length}
                >
                  {isCheckingAvailability ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    'View full availability'
                  )}
                </Button>

                <div className="border-t border-[#e5e9f1] pt-3 text-sm text-slate-600">
                  <p className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#5f9150]" />
                    Dining service from 12:00 to 16:30
                  </p>
                  <p className="mt-1">Closed on Tuesday and Wednesday.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
