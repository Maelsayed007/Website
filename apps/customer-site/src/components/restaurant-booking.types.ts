import { addDays, format } from 'date-fns';

export type RestaurantQuickDraft = {
  menuId: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  seniors: number;
};

export type RestaurantMenuOption = {
  id: string;
  name: string;
  description?: string | null;
  price_adult: number;
  price_child: number;
  price_senior?: number | null;
  is_active: boolean;
  sort_order?: number | null;
  translations?: Record<string, Record<string, string>>;
};

export type RestaurantAvailabilityPayload = {
  available: boolean;
  reason: string;
  currentLoad: number;
  remainingCapacity: number;
  projectedLoad: number;
  maxCapacity?: number;
  requiresManualReview?: boolean;
};

export const RESTAURANT_TIME_OPTIONS = [
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

export const RESTAURANT_DEFAULT_TIME = '12:00';
export const RESTAURANT_DEFAULT_GUESTS = 2;

export function isRestaurantClosedDay(date: Date) {
  const day = date.getDay();
  return day === 2 || day === 3;
}

export function getDefaultRestaurantDateString() {
  let candidate = addDays(new Date(), 1);
  for (let i = 0; i < 7; i += 1) {
    if (!isRestaurantClosedDay(candidate)) {
      return format(candidate, 'yyyy-MM-dd');
    }
    candidate = addDays(candidate, 1);
  }
  return format(candidate, 'yyyy-MM-dd');
}

export function toInputDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function parseInputDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function toSafeInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function normalizeQuickDraft(
  draft: Partial<RestaurantQuickDraft>,
  fallbackMenuId: string,
): RestaurantQuickDraft {
  return {
    menuId: draft.menuId || fallbackMenuId,
    date: draft.date || getDefaultRestaurantDateString(),
    time: draft.time || RESTAURANT_DEFAULT_TIME,
    adults: toSafeInt(draft.adults, RESTAURANT_DEFAULT_GUESTS),
    children: toSafeInt(draft.children, 0),
    seniors: toSafeInt(draft.seniors, 0),
  };
}

export function getAvailabilityReasonText(reason: string) {
  if (reason === 'closed_day') return 'The restaurant is closed on Tuesday and Wednesday. Please choose another date.';
  if (reason === 'closed_time') return 'Please choose a time between 12:00 and 16:30.';
  if (reason === 'capacity_exceeded') return 'Selected slot unavailable, please try another time.';
  if (reason === 'invalid_input') return 'Please review date, time, and guest details.';
  return 'Selected slot is available.';
}
