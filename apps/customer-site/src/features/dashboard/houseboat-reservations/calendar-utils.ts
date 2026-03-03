import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import type { Boat } from '@/lib/types';
import type {
  CalendarProcessedBooking,
  HouseboatReservationZoom,
  MappedBooking,
  SourceFilterId,
} from './types';

export const SLOT_WIDTH = 28;
export const BOAT_COL_WIDTH = 232;
export const HORIZONTAL_DAY_WIDTH = SLOT_WIDTH * 2;

export const SOURCE_OPTIONS: Array<{ id: SourceFilterId; name: string }> = [
  { id: 'website', name: 'Website' },
  { id: 'nicols', name: 'Nicols' },
  { id: 'diaria', name: 'Diaria' },
  { id: 'ancorado', name: 'Ancorado' },
  { id: 'amieira', name: 'Amieira' },
  { id: 'manual', name: 'Manual' },
];

export function getVisibleRange(anchorDate: Date, zoom: HouseboatReservationZoom) {
  if (zoom === 'week') {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
    return { start, end };
  }

  if (zoom === 'month') {
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    return { start, end };
  }

  if (zoom === 'quarter') {
    const start = startOfQuarter(anchorDate);
    const end = endOfQuarter(anchorDate);
    return { start, end };
  }

  return {
    start: startOfYear(anchorDate),
    end: endOfYear(anchorDate),
  };
}

export function buildRangeCalendarData(anchorDate: Date, zoom: HouseboatReservationZoom) {
  const range = getVisibleRange(anchorDate, zoom);
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const months = eachMonthOfInterval({ start: range.start, end: range.end });
  return {
    range,
    days,
    months,
  };
}

export function mapBookingRecord(b: any): MappedBooking {
  return {
    ...b,
    price: b.total_price || b.price || 0,
    clientName: b.client_name,
    clientEmail: b.client_email,
    clientPhone: b.client_phone,
    startTime: b.start_time,
    endTime: b.end_time,
    houseboatId: b.houseboat_id,
    restaurantTableId: b.restaurant_table_id,
    riverCruisePackageId: b.daily_travel_package_id,
    numberOfGuests: b.number_of_guests || 2,
    selectedExtras: b.selected_extras || [],
    extras: b.selected_extras || [],
  };
}

export function dedupeBoatsById(boats: Boat[]) {
  const byId = new Map<string, Boat>();
  for (const boat of boats) {
    if (!boat.id) continue;
    if (!byId.has(boat.id)) {
      byId.set(boat.id, boat);
      continue;
    }
    // Keep the richest row if duplicated rows exist.
    const existing = byId.get(boat.id)!;
    byId.set(boat.id, {
      ...existing,
      ...boat,
      name: boat.name || existing.name,
      model_id: boat.model_id || existing.model_id,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function dedupeBookingsById(bookings: MappedBooking[]) {
  const byId = new Map<string, MappedBooking>();
  for (const booking of bookings) {
    byId.set(booking.id, booking);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    return aTime - bTime;
  });
}

export function bookingOverlapsRange(booking: MappedBooking, range: { start: Date; end: Date }) {
  const start = parseISO(booking.startTime);
  const end = parseISO(booking.endTime);
  return !(isAfter(start, range.end) || isBefore(end, range.start));
}

export function bookingMatchesRealtimeFilters(
  booking: MappedBooking,
  selectedStatuses: string[],
  selectedSources: string[],
  searchTerm: string
) {
  if (selectedStatuses.length > 0 && !selectedStatuses.includes(booking.status)) return false;

  const source = (booking.source || 'manual').toLowerCase();
  if (selectedSources.length > 0 && !selectedSources.includes(source)) return false;

  if (!searchTerm.trim()) return true;
  const query = searchTerm.toLowerCase();
  return (
    (booking.clientName || '').toLowerCase().includes(query) ||
    (booking.clientEmail || '').toLowerCase().includes(query) ||
    booking.id.toLowerCase().includes(query)
  );
}

function getSourceBaseStyle(source: string) {
  switch ((source || 'manual').toLowerCase()) {
    case 'website':
      return { solid: 'bg-emerald-600 border-emerald-700 text-white', pending: 'bg-red-600 border-red-700 text-white' };
    case 'nicols':
      return { solid: 'bg-amber-500 border-amber-600 text-zinc-950', pending: 'bg-red-600 border-red-700 text-white' };
    case 'amieira':
      return { solid: 'bg-cyan-800 border-cyan-900 text-white', pending: 'bg-red-600 border-red-700 text-white' };
    case 'diaria':
      return { solid: 'bg-violet-600 border-violet-700 text-white', pending: 'bg-red-600 border-red-700 text-white' };
    case 'ancorado':
      return { solid: 'bg-sky-700 border-sky-800 text-white', pending: 'bg-red-600 border-red-700 text-white' };
    default:
      return { solid: 'bg-cyan-800 border-cyan-900 text-white', pending: 'bg-red-600 border-red-700 text-white' };
  }
}

export function getReservationBlockClass(booking: MappedBooking) {
  if (booking.status === 'Cancelled') return 'hidden';
  if (booking.status === 'Maintenance') return 'bg-zinc-900 border-zinc-950 text-white';

  const sourceStyle = getSourceBaseStyle(booking.source || 'manual');
  const isPending = booking.status === 'Pending';
  return isPending ? sourceStyle.pending : sourceStyle.solid;
}

export function processBookingsForGrid(params: {
  bookings: MappedBooking[];
  boats: Boat[];
  range: { start: Date; end: Date };
  rowHeight: number;
}): CalendarProcessedBooking[] {
  const { bookings, boats, range, rowHeight } = params;
  const boatIndexMap = new Map(boats.map((boat, idx) => [boat.id, idx]));

  const totalSlots = eachDayOfInterval({ start: range.start, end: range.end }).length * 2;

  const projected = bookings
    .map((booking) => {
      const boatIndex = boatIndexMap.get(booking.houseboatId || '');
      if (boatIndex === undefined) return null;
      if (!bookingOverlapsRange(booking, range)) return null;

      const start = parseISO(booking.startTime);
      const end = parseISO(booking.endTime);

      let startSlotIndex = differenceInCalendarDays(start, range.start) * 2;
      if (start.getHours() >= 12) startSlotIndex += 1;

      let endSlotIndex = differenceInCalendarDays(end, range.start) * 2;
      if (end.getHours() >= 12) endSlotIndex += 1;

      const clampedStart = Math.max(0, startSlotIndex);
      const clampedEnd = Math.min(totalSlots - 1, endSlotIndex);
      if (clampedEnd < clampedStart) return null;

      const widthSlots = clampedEnd - clampedStart + 1;

      return {
        ...booking,
        boatIndex,
        startSlotIndex: clampedStart,
        endSlotIndex: clampedEnd,
        left: clampedStart * SLOT_WIDTH,
        width: widthSlots * SLOT_WIDTH,
        top: boatIndex * rowHeight,
        isOverflowLeft: startSlotIndex < 0,
        isOverflowRight: endSlotIndex >= totalSlots,
      };
    })
    .filter((booking): booking is CalendarProcessedBooking => Boolean(booking));
  return projected;
}
