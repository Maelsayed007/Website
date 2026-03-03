import Link from 'next/link';
import { CalendarDays, Clock3, Users } from 'lucide-react';
import { cookies } from 'next/headers';

import RestaurantReservationForm from '@/components/restaurant-reservation-form';
import {
  normalizeQuickDraft,
  RESTAURANT_TIME_OPTIONS,
  RestaurantMenuOption,
} from '@/components/restaurant-booking.types';
import { getDictionary } from '@/lib/dictionary';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type SearchParams = { [key: string]: string | string[] | undefined };

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function toSafeInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function getTranslated(item: any, locale: string, field: string, fallback: string) {
  return item?.translations?.[locale]?.[field] || fallback;
}

export default async function RestaurantReservePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const [dictionary, menus] = await Promise.all([getDictionary(locale), fetchMenus()]);
  const firstMenuId = menus[0]?.id || '';

  const dateParamRaw = getParam(searchParams, 'date');
  const dateParam = dateParamRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateParamRaw) ? dateParamRaw : undefined;

  const timeParamRaw = getParam(searchParams, 'time');
  const timeParam = timeParamRaw && RESTAURANT_TIME_OPTIONS.includes(timeParamRaw) ? timeParamRaw : undefined;

  const parsedDraft = normalizeQuickDraft(
    {
      menuId: getParam(searchParams, 'menuId') || firstMenuId,
      date: dateParam,
      time: timeParam,
      adults: toSafeInt(getParam(searchParams, 'adults'), 2),
      children: toSafeInt(getParam(searchParams, 'children'), 0),
      seniors: toSafeInt(getParam(searchParams, 'seniors'), 0),
    },
    firstMenuId,
  );

  const totalGuests = parsedDraft.adults + parsedDraft.children + parsedDraft.seniors;
  const initialDraft =
    totalGuests > 0
      ? parsedDraft
      : {
          ...parsedDraft,
          adults: 2,
        };

  const selectedMenu =
    menus.find((menu: RestaurantMenuOption) => menu.id === initialDraft.menuId) || menus[0];

  return (
    <main className="min-h-screen bg-[#f6f8fc] pb-16 pt-10 md:pb-20 md:pt-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Link href="/restaurant" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f9150] hover:text-[#4f7d43]">
          Back to restaurant page
        </Link>

        <div className="mt-4 rounded-2xl border border-[#d8e6d1] bg-white p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f9150]">Reservation</p>
          <h1 className="font-display mt-1 text-[2.2rem] font-bold tracking-tight text-[#0e1738] md:text-[2.9rem]">
            Complete your table reservation
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            Confirm your details and continue to secure your table with the required deposit.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d8e6d1] bg-[#f4f9f1] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Menu</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#0e1738]">
                {selectedMenu ? getTranslated(selectedMenu, locale, 'name', selectedMenu.name) : 'Select menu'}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8e6d1] bg-[#f4f9f1] px-3 py-2">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-[#5f9150]" />
                Date and time
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-[#0e1738]">
                <Clock3 className="h-3.5 w-3.5 text-[#5f9150]" />
                {initialDraft.date} at {initialDraft.time}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8e6d1] bg-[#f4f9f1] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Guests</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-[#0e1738]">
                <Users className="h-3.5 w-3.5 text-[#5f9150]" />
                {initialDraft.adults} adults, {initialDraft.children} children, {initialDraft.seniors} seniors
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#d8e6d1] bg-white p-5 md:p-7">
          <RestaurantReservationForm
            dictionary={dictionary.restaurant}
            preselectedMenuId={initialDraft.menuId}
            providedMenus={menus}
            initialDraft={initialDraft}
            initialStep={1}
          />
        </div>
      </div>
    </main>
  );
}

async function fetchMenus() {
  const supabase = await createClient();
  let menus = await fetchMenusWithClient(supabase);

  if (menus.length === 0) {
    try {
      const admin = createAdminClient();
      const adminMenus = await fetchMenusWithClient(admin);
      if (adminMenus.length) {
        menus = adminMenus;
      }
    } catch {
      // Keep anon result if service role is unavailable.
    }
  }

  return menus;
}

async function fetchMenusWithClient(client: any) {
  const { data, error } = await client
    .from('restaurant_menus')
    .select('id, name, description, price_adult, price_child, price_senior, is_active, sort_order, translations')
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data) return [];

  return data.map(
    (menu: any) =>
      ({
        ...menu,
        price_senior: menu.price_senior || menu.price_adult || 0,
      }) satisfies RestaurantMenuOption,
  );
}
