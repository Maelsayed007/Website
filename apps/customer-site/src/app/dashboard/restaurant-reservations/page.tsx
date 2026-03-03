'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  addMonths,
  addMinutes,
  eachDayOfInterval,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Users,
} from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  normalizePermissions,
  type PermissionSource,
} from '@/lib/auth/permissions';
import {
  calculateRestaurantTotalFromAgeBreakdown,
  evaluateRestaurantAvailability,
  getRestaurantBookingPolicy,
  toLisbonUtcDate,
} from '@/lib/booking-rules';
import {
  getAvailabilityReasonText,
  getDefaultRestaurantDateString,
  RESTAURANT_TIME_OPTIONS,
  type RestaurantMenuOption,
} from '@/components/restaurant-booking.types';

type ReservationStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Maintenance';

type RestaurantGuestDetail = {
  ageGroup: 'adult' | 'child' | 'senior';
  quantity: number;
  menuId?: string;
  menuPackageId?: string;
  price?: number;
};

type RestaurantBooking = {
  id: string;
  houseboat_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string;
  notes?: string | null;
  restaurant_table_id?: string | null;
  number_of_guests?: number | null;
  guest_details?: RestaurantGuestDetail[] | null;
  total_price?: number | null;
  price?: number | null;
  amount_paid?: number | null;
  payment_status?: string | null;
  booking_type?: string | null;
};

type PaymentTransactionRow = {
  id: string;
  booking_id: string;
  amount?: number | null;
  status?: string | null;
};

type ReservationFormState = {
  id?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: ReservationStatus;
  source: string;
  menuId: string;
  adults: number;
  children: number;
  seniors: number;
  amountPaid: number;
  totalPrice: number;
  notes: string;
};

const STATUS_OPTIONS: ReservationStatus[] = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Maintenance',
];

const DEFAULT_DURATION_MINUTES = 120;

function clampInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGuestAge(value: unknown): RestaurantGuestDetail['ageGroup'] {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'child') return 'child';
  if (normalized === 'senior') return 'senior';
  return 'adult';
}

function normalizeGuestDetails(value: unknown): RestaurantGuestDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const guest = item as Record<string, unknown>;
      return {
        ageGroup: normalizeGuestAge(guest.ageGroup),
        quantity: clampInteger(guest.quantity, 0),
        menuId:
          typeof guest.menuId === 'string'
            ? guest.menuId
            : typeof guest.menuPackageId === 'string'
              ? guest.menuPackageId
              : undefined,
        menuPackageId:
          typeof guest.menuPackageId === 'string' ? guest.menuPackageId : undefined,
        price: safeNumber(guest.price, 0),
      };
    })
    .filter((guest) => guest.quantity > 0);
}

function extractGuestCount(
  details: RestaurantGuestDetail[],
  ageGroup: RestaurantGuestDetail['ageGroup']
) {
  return details
    .filter((detail) => detail.ageGroup === ageGroup)
    .reduce((sum, detail) => sum + clampInteger(detail.quantity, 0), 0);
}

function extractMenuId(details: RestaurantGuestDetail[]) {
  const withMenu = details.find((detail) => detail.menuId || detail.menuPackageId);
  return withMenu?.menuId || withMenu?.menuPackageId || '';
}

function createDefaultForm(menuId: string, selectedDate?: string): ReservationFormState {
  return {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: selectedDate || getDefaultRestaurantDateString(),
    time: RESTAURANT_TIME_OPTIONS[0] || '12:00',
    durationMinutes: DEFAULT_DURATION_MINUTES,
    status: 'Pending',
    source: 'manual',
    menuId,
    adults: 2,
    children: 0,
    seniors: 0,
    amountPaid: 0,
    totalPrice: 0,
    notes: '',
  };
}

function formatCurrency(value: number) {
  return `EUR ${Math.max(0, value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'Confirmed':
      return 'border-emerald-400/45 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100';
    case 'Pending':
      return 'border-amber-400/50 bg-amber-400/20 text-amber-900 dark:text-amber-100';
    case 'Cancelled':
      return 'border-rose-400/45 bg-rose-500/15 text-rose-900 dark:text-rose-100';
    case 'Maintenance':
      return 'border-zinc-500/60 bg-zinc-500/15 text-zinc-800 dark:text-zinc-100';
    default:
      return 'border-border bg-muted/40 text-foreground';
  }
}

function summarizeBookings(rows: RestaurantBooking[]) {
  const totalReservations = rows.length;
  const pending = rows.filter((booking) => booking.status === 'Pending').length;
  const totalCovers = rows.reduce(
    (sum, booking) => sum + clampInteger(booking.number_of_guests, 0),
    0
  );
  const totalDue = rows.reduce((sum, booking) => {
    const total = safeNumber(booking.total_price ?? booking.price, 0);
    const paid = safeNumber(booking.amount_paid, 0);
    return sum + Math.max(0, total - paid);
  }, 0);

  return {
    totalReservations,
    pending,
    totalCovers,
    totalDue,
  };
}

function getBookingMenuName(
  booking: RestaurantBooking,
  menuById: Map<string, RestaurantMenuOption>
) {
  const details = normalizeGuestDetails(booking.guest_details);
  const menuId = extractMenuId(details);
  if (!menuId) return 'Menu n/a';
  return menuById.get(menuId)?.name || 'Archived menu';
}

function isRestaurantBookingRecord(booking: RestaurantBooking) {
  const type = String(booking.booking_type || '').toLowerCase();
  if (type) return type === 'restaurant_reservation';
  if (booking.restaurant_table_id) return true;
  const source = String(booking.source || '').toLowerCase();
  if (source.includes('restaurant')) return true;
  return !booking.houseboat_id && normalizeGuestDetails(booking.guest_details).length > 0;
}

export default function RestaurantReservationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const [permissionSource, setPermissionSource] = useState<PermissionSource>(null);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(true);

  const initialQuery = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialView = searchParams.get('view') === 'calendar' ? 'calendar' : 'table';
  const initialDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [localSearch, setLocalSearch] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>(initialView);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    () => parseISO(`${initialDate}T00:00:00`)
  );

  const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
  const [menus, setMenus] = useState<RestaurantMenuOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBooking, setEditingBooking] = useState<RestaurantBooking | null>(null);
  const [form, setForm] = useState<ReservationFormState>(() => createDefaultForm(''));
  const [dayViewDate, setDayViewDate] = useState(initialDate);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);

  const [deletingBooking, setDeletingBooking] = useState<RestaurantBooking | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(localSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [localSearch]);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    const nextStatus = searchParams.get('status') || 'all';
    const nextView = searchParams.get('view') === 'calendar' ? 'calendar' : 'table';
    const nextDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    setLocalSearch((prev) => (prev === query ? prev : query));
    setSearchTerm((prev) => (prev === query ? prev : query));
    setStatusFilter((prev) => (prev === nextStatus ? prev : nextStatus));
    setViewMode((prev) => (prev === nextView ? prev : nextView));
    setSelectedDate((prev) => (prev === nextDate ? prev : nextDate));
    setDayViewDate((prev) => (prev === nextDate ? prev : nextDate));
    setCalendarDate((prev) => {
      const next = parseISO(`${nextDate}T00:00:00`);
      if (!prev) return next;
      return format(prev, 'yyyy-MM-dd') === nextDate ? prev : next;
    });
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set('q', searchTerm);
    if (statusFilter !== 'all') nextParams.set('status', statusFilter);
    if (viewMode === 'calendar') nextParams.set('view', 'calendar');
    if (viewMode === 'calendar' && selectedDate) nextParams.set('date', selectedDate);

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [router, pathname, searchParams, searchTerm, statusFilter, viewMode, selectedDate]);

  useEffect(() => {
    let active = true;
    const loadPermissions = async () => {
      try {
        const response = await fetch('/api/admin/auth/session');
        if (!response.ok) {
          if (active) setPermissionSource(null);
          return;
        }
        const payload = await response.json();
        if (!active) return;
        if (payload?.user) {
          setPermissionSource({
            role: payload.user.role,
            permissions: payload.user.permissions,
          });
        } else {
          setPermissionSource(null);
        }
      } catch {
        if (active) setPermissionSource(null);
      } finally {
        if (active) setIsPermissionsLoading(false);
      }
    };

    void loadPermissions();
    return () => {
      active = false;
    };
  }, []);

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) return;

      if (options?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const [bookingsRes, menusRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(
              'id,houseboat_id,client_name,client_email,client_phone,start_time,end_time,status,source,notes,restaurant_table_id,number_of_guests,guest_details,total_price,price,amount_paid,payment_status,booking_type'
            )
            .or('booking_type.eq.restaurant_reservation,restaurant_table_id.not.is.null,source.ilike.%restaurant%')
            .order('start_time', { ascending: true }),
          supabase
            .from('restaurant_menus')
            .select('id,name,price_adult,price_child,price_senior,is_active,sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (menusRes.error) throw menusRes.error;

        const incomingBookings = ((bookingsRes.data || []) as RestaurantBooking[]).filter(
          isRestaurantBookingRecord
        );

        const incomingMenus = ((menusRes.data || []) as RestaurantMenuOption[]).map((menu) => ({
          ...menu,
          price_adult: safeNumber(menu.price_adult, 0),
          price_child: safeNumber(menu.price_child, 0),
          price_senior: safeNumber(menu.price_senior, safeNumber(menu.price_adult, 0)),
        }));

        setBookings(incomingBookings);
        setMenus(incomingMenus);
        setForm((prev) =>
          prev.menuId || incomingMenus.length === 0 ? prev : { ...prev, menuId: incomingMenus[0].id }
        );
      } catch (error: any) {
        const message = error?.message || 'Failed to load restaurant reservations.';
        setErrorMessage(message);
        toast({
          variant: 'destructive',
          title: 'Load failed',
          description: message,
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [supabase, toast]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const permissions = useMemo(() => normalizePermissions(permissionSource), [permissionSource]);
  const canView = Boolean(
    permissions.isSuperAdmin ||
      permissions.canViewBookings ||
      permissions.canViewRestaurantReservations ||
      permissions.canEditBookings ||
      permissions.canEditRestaurantReservations
  );
  const canEdit = Boolean(
    permissions.isSuperAdmin ||
      permissions.canEditBookings ||
      permissions.canEditRestaurantReservations
  );

  const menuById = useMemo(() => new Map(menus.map((menu) => [menu.id, menu])), [menus]);

  const baseFilteredBookings = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return bookings
      .filter((booking) => {
        if (statusFilter !== 'all' && booking.status !== statusFilter) return false;

        if (!query) return true;
        const haystack = [
          booking.id,
          booking.client_name || '',
          booking.client_email || '',
          booking.client_phone || '',
          booking.status || '',
          getBookingMenuName(booking, menuById),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [bookings, searchTerm, statusFilter, menuById]);

  const filteredBookings = useMemo(() => baseFilteredBookings, [baseFilteredBookings]);

  const monthAnchorDate = useMemo(
    () => calendarDate ?? parseISO(`${selectedDate}T00:00:00`),
    [calendarDate, selectedDate]
  );
  const nextMonthAnchorDate = useMemo(() => addMonths(monthAnchorDate, 1), [monthAnchorDate]);
  const monthRangeLabel = `${format(monthAnchorDate, 'MMM yyyy')} - ${format(nextMonthAnchorDate, 'MMM yyyy')}`;
  const dualMonthViews = useMemo(
    () =>
      [monthAnchorDate, nextMonthAnchorDate].map((anchorDate) => {
        const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });
        return {
          anchorDate,
          label: format(anchorDate, 'MMMM yyyy'),
          days,
          rowCount: Math.max(5, Math.ceil(days.length / 7)),
        };
      }),
    [monthAnchorDate, nextMonthAnchorDate]
  );
  const bookingsByDayKey = useMemo(() => {
    const map = new Map<string, RestaurantBooking[]>();
    for (const booking of baseFilteredBookings) {
      const key = format(parseISO(booking.start_time), 'yyyy-MM-dd');
      const list = map.get(key);
      if (list) {
        list.push(booking);
      } else {
        map.set(key, [booking]);
      }
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    }
    return map;
  }, [baseFilteredBookings]);

  const tableStats = useMemo(() => summarizeBookings(filteredBookings), [filteredBookings]);
  const calendarStats = useMemo(
    () => summarizeBookings(baseFilteredBookings),
    [baseFilteredBookings]
  );
  const dayViewBookings = useMemo(
    () => bookingsByDayKey.get(dayViewDate) || [],
    [bookingsByDayKey, dayViewDate]
  );
  const dayViewStats = useMemo(() => summarizeBookings(dayViewBookings), [dayViewBookings]);
  const dayViewLabel = useMemo(
    () => format(parseISO(`${dayViewDate}T00:00:00`), 'EEEE, MMMM dd, yyyy'),
    [dayViewDate]
  );

  const selectedMenu = useMemo(
    () => menus.find((menu) => menu.id === form.menuId) || null,
    [menus, form.menuId]
  );

  const partySize =
    Math.max(0, form.adults) + Math.max(0, form.children) + Math.max(0, form.seniors);

  const computedTotal = useMemo(() => {
    if (!selectedMenu) return Math.max(0, safeNumber(form.totalPrice, 0));
    return calculateRestaurantTotalFromAgeBreakdown({
      priceAdult: safeNumber(selectedMenu.price_adult, 0),
      priceChild: safeNumber(selectedMenu.price_child, 0),
      priceSenior: safeNumber(selectedMenu.price_senior, safeNumber(selectedMenu.price_adult, 0)),
      adults: Math.max(0, form.adults),
      children: Math.max(0, form.children),
      seniors: Math.max(0, form.seniors),
    });
  }, [selectedMenu, form.totalPrice, form.adults, form.children, form.seniors]);

  const computedDue = useMemo(
    () => Math.max(0, computedTotal - Math.max(0, safeNumber(form.amountPaid, 0))),
    [computedTotal, form.amountPaid]
  );
  const adultRate = safeNumber(selectedMenu?.price_adult, 0);
  const childRate = safeNumber(selectedMenu?.price_child, 0);
  const seniorRate = safeNumber(selectedMenu?.price_senior, adultRate);
  const adultSubtotal = Math.max(0, form.adults) * adultRate;
  const childSubtotal = Math.max(0, form.children) * childRate;
  const seniorSubtotal = Math.max(0, form.seniors) * seniorRate;

  const openNewReservation = useCallback(() => {
    const defaultMenuId = menus[0]?.id || '';
    setEditingBooking(null);
    setForm(
      createDefaultForm(defaultMenuId, selectedDate || getDefaultRestaurantDateString())
    );
    setIsFormOpen(true);
  }, [menus, selectedDate]);
  const openNewReservationForDate = useCallback(
    (dateOverride: string) => {
      const defaultMenuId = menus[0]?.id || '';
      setEditingBooking(null);
      setForm(createDefaultForm(defaultMenuId, dateOverride || getDefaultRestaurantDateString()));
      setIsFormOpen(true);
    },
    [menus]
  );

  const openEditReservation = useCallback(
    (booking: RestaurantBooking) => {
      const details = normalizeGuestDetails(booking.guest_details);
      const menuId = extractMenuId(details) || menus[0]?.id || '';
      const start = parseISO(booking.start_time);
      const end = parseISO(booking.end_time);
      const durationMinutes = Math.max(
        30,
        Number.isFinite(differenceInMinutes(end, start))
          ? differenceInMinutes(end, start)
          : DEFAULT_DURATION_MINUTES
      );

      setEditingBooking(booking);
      setForm({
        id: booking.id,
        clientName: booking.client_name || '',
        clientEmail: booking.client_email || '',
        clientPhone: booking.client_phone || '',
        date: format(start, 'yyyy-MM-dd'),
        time: format(start, 'HH:mm'),
        durationMinutes,
        status: STATUS_OPTIONS.includes(booking.status as ReservationStatus)
          ? (booking.status as ReservationStatus)
          : 'Pending',
        source: booking.source || 'manual',
        menuId,
        adults: extractGuestCount(details, 'adult'),
        children: extractGuestCount(details, 'child'),
        seniors: extractGuestCount(details, 'senior'),
        amountPaid: safeNumber(booking.amount_paid, 0),
        totalPrice: safeNumber(booking.total_price ?? booking.price, 0),
        notes: booking.notes || '',
      });
      setIsFormOpen(true);
    },
    [menus]
  );

  useEffect(() => {
    if (searchParams.get('action') !== 'new') return;
    if (!canEdit) return;

    openNewReservation();
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, canEdit, openNewReservation, pathname, router]);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingBooking(null);
  }, []);

  const syncPaidAmountWithLedger = useCallback(
    async (bookingId: string, targetPaid: number, previousPaid: number) => {
      const tolerance = 0.01;

      const createManualPayment = async (amount: number, ref: string) => {
        if (Math.abs(amount) < tolerance) return;
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            amount: Number(amount.toFixed(2)),
            method: amount >= 0 ? 'transfer' : 'adjustment',
            ref,
            date: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Could not write payment transaction.');
        }
      };

      try {
        const response = await fetch(`/api/payments?bookingId=${encodeURIComponent(bookingId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Could not load booking payments.');
        }

        const payload = await response.json();
        const transactions = (Array.isArray(payload?.transactions)
          ? payload.transactions
          : []) as PaymentTransactionRow[];
        const succeeded = transactions.filter((tx) => tx.status === 'succeeded');
        let ledgerPaid = succeeded.reduce((sum, tx) => sum + safeNumber(tx.amount, 0), 0);

        if (succeeded.length === 0 && previousPaid > 0) {
          await createManualPayment(previousPaid, 'Opening balance sync');
          ledgerPaid = previousPaid;
        }

        const delta = Number((targetPaid - ledgerPaid).toFixed(2));
        if (Math.abs(delta) >= tolerance) {
          await createManualPayment(delta, 'Reservation editor adjustment');
        }

        return null;
      } catch (error: any) {
        return error?.message || 'Payment sync failed.';
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!supabase || isSaving) return;
    if (!canEdit) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'You do not have permission to edit restaurant reservations.',
      });
      return;
    }

    if (!form.clientName.trim()) {
      toast({ variant: 'destructive', title: 'Client name required' });
      return;
    }
    if (!form.clientEmail.trim()) {
      toast({ variant: 'destructive', title: 'Client email required' });
      return;
    }
    if (!form.date || !form.time) {
      toast({ variant: 'destructive', title: 'Date and time required' });
      return;
    }
    if (!form.menuId) {
      toast({ variant: 'destructive', title: 'Menu selection required' });
      return;
    }
    if (partySize <= 0) {
      toast({
        variant: 'destructive',
        title: 'Guests required',
        description: 'At least one guest is required for a reservation.',
      });
      return;
    }

    const start = toLisbonUtcDate(form.date, form.time);
    if (!start) {
      toast({
        variant: 'destructive',
        title: 'Invalid date/time',
        description: 'Could not parse the selected reservation date and time.',
      });
      return;
    }
    const end = addMinutes(start, Math.max(30, safeNumber(form.durationMinutes, DEFAULT_DURATION_MINUTES)));

    if (form.status !== 'Cancelled') {
      const policy = getRestaurantBookingPolicy({
        date: form.date,
        time: form.time,
        partySize,
      });

      if (!policy.isOpenDay || !policy.isOpenTime) {
        const reason = !policy.isOpenDay ? 'closed_day' : 'closed_time';
        toast({
          variant: 'destructive',
          title: 'Outside service window',
          description: getAvailabilityReasonText(reason),
        });
        return;
      }

      const comparisonBookings = bookings
        .filter((booking) => booking.id !== editingBooking?.id)
        .filter((booking) => booking.status !== 'Cancelled')
        .map((booking) => ({
          startTime: booking.start_time,
          endTime: booking.end_time,
          guests: safeNumber(booking.number_of_guests, 0),
        }));

      const availability = evaluateRestaurantAvailability({
        date: form.date,
        time: form.time,
        partySize,
        durationMinutes: Math.max(30, safeNumber(form.durationMinutes, DEFAULT_DURATION_MINUTES)),
        bookings: comparisonBookings,
      });

      if (!availability.available) {
        toast({
          variant: 'destructive',
          title: 'Slot unavailable',
          description: getAvailabilityReasonText(availability.reason),
        });
        return;
      }

    }

    const menu = menuById.get(form.menuId);
    const guestDetailsCandidates: RestaurantGuestDetail[] = [
      {
        ageGroup: 'adult',
        quantity: Math.max(0, form.adults),
        menuId: form.menuId,
        price: safeNumber(menu?.price_adult, 0),
      },
      {
        ageGroup: 'child',
        quantity: Math.max(0, form.children),
        menuId: form.menuId,
        price: safeNumber(menu?.price_child, 0),
      },
      {
        ageGroup: 'senior',
        quantity: Math.max(0, form.seniors),
        menuId: form.menuId,
        price: safeNumber(menu?.price_senior, safeNumber(menu?.price_adult, 0)),
      },
    ];
    const guestDetails = guestDetailsCandidates.filter((detail) => detail.quantity > 0);

    const totalPrice = Math.max(0, computedTotal);
    const amountPaid = Math.max(0, safeNumber(form.amountPaid, 0));
    const paymentStatus =
      amountPaid >= totalPrice ? 'fully_paid' : amountPaid > 0 ? 'deposit_paid' : 'unpaid';

    const payload = {
      client_name: form.clientName.trim(),
      client_email: form.clientEmail.trim(),
      client_phone: form.clientPhone.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: form.status,
      source: (form.source || 'manual').toLowerCase(),
      notes: form.notes.trim(),
      restaurant_table_id: null,
      number_of_guests: partySize,
      guest_details: guestDetails,
      total_price: totalPrice,
      price: totalPrice,
      amount_paid: amountPaid,
      payment_status: paymentStatus,
      booking_type: 'restaurant_reservation',
    };

    setIsSaving(true);
    try {
      const bookingId = editingBooking?.id || crypto.randomUUID();
      if (editingBooking?.id) {
        const { error } = await supabase.from('bookings').update(payload).eq('id', editingBooking.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bookings').insert({
          id: bookingId,
          ...payload,
        });
        if (error) throw error;
      }

      const paymentSyncWarning = await syncPaidAmountWithLedger(
        bookingId,
        amountPaid,
        safeNumber(editingBooking?.amount_paid, 0)
      );
      if (paymentSyncWarning) {
        toast({
          variant: 'destructive',
          title: 'Payment sync warning',
          description: paymentSyncWarning,
        });
      }

      toast({
        title: 'Saved',
        description: `Reservation ${editingBooking?.id ? 'updated' : 'created'} successfully.`,
      });
      closeForm();
      await loadData({ silent: true });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not save reservation.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    bookings,
    canEdit,
    closeForm,
    computedTotal,
    editingBooking?.id,
    editingBooking?.amount_paid,
    form,
    isSaving,
    loadData,
    menuById,
    partySize,
    supabase,
    syncPaidAmountWithLedger,
    toast,
  ]);

  const handleDelete = useCallback(async () => {
    if (!supabase || !deletingBooking?.id) return;
    if (!canEdit) return;

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', deletingBooking.id);
      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Reservation removed successfully.',
      });
      setIsDeleteDialogOpen(false);
      setDeletingBooking(null);
      if (editingBooking?.id === deletingBooking.id) {
        closeForm();
      }
      await loadData({ silent: true });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete reservation.',
      });
    }
  }, [canEdit, closeForm, deletingBooking, editingBooking?.id, loadData, supabase, toast]);

  if (isPermissionsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="mb-3 h-12 w-full rounded-xl" />
        <Skeleton className="h-[640px] w-full rounded-xl" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-4">
        <Card className="border border-border bg-card shadow-none">
          <CardContent className="py-14 text-center">
            <p className="text-base font-semibold text-foreground">Access denied</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view restaurant reservations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showInitialLoading = isLoading && bookings.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 flex-col bg-background">
      <div className="sticky top-14 z-20 border-b border-border bg-background/95 px-2 py-2.5 backdrop-blur sm:px-3">
        <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center gap-2">
          <div className="relative min-w-[18rem] max-w-[30rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Search client, email, phone or reference..."
              className="h-10 rounded-full border-border/80 bg-card/80 pl-9 text-sm shadow-none"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[11rem] rounded-full border-border/80 bg-card/80 text-sm shadow-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {viewMode === 'calendar' ? (
            <div className="flex items-center rounded-full border border-border/80 bg-card/80 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const next = addMonths(monthAnchorDate, -1);
                  setCalendarDate(next);
                  setSelectedDate(format(next, 'yyyy-MM-dd'));
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium text-foreground">{monthRangeLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const next = addMonths(monthAnchorDate, 1);
                  setCalendarDate(next);
                  setSelectedDate(format(next, 'yyyy-MM-dd'));
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex items-center rounded-full border border-border/80 bg-card/80 p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3',
                viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('table')}
            >
              <Table2 className="mr-1.5 h-4 w-4" />
              Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3',
                viewMode === 'calendar' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Month
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                setSelectedDate(today);
                setCalendarDate(parseISO(`${today}T00:00:00`));
              }}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Refresh reservations"
              className="h-10 w-10 rounded-full"
              onClick={() => void loadData({ silent: true })}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button className="h-10 rounded-full px-4" onClick={openNewReservation} disabled={!canEdit}>
              <Plus className="mr-2 h-4 w-4" />
              New reservation
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Restaurant reservations
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
              {viewMode === 'table'
                ? `${filteredBookings.length} reservations | ${tableStats.pending} pending | ${tableStats.totalCovers} covers`
                : `${calendarStats.totalReservations} reservations | ${calendarStats.pending} pending | ${monthRangeLabel}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            {showInitialLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : viewMode === 'table' ? (
              filteredBookings.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-foreground">No reservations found</p>
                  <p className="text-sm text-muted-foreground">
                    Change filters or create a new reservation.
                  </p>
                  {canEdit ? (
                    <Button className="mt-2 rounded-full px-4" onClick={openNewReservation}>
                      <Plus className="mr-2 h-4 w-4" />
                      New reservation
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="min-w-[980px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b border-border text-left">
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Schedule
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Guest
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Covers
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Menu
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Financial
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => {
                        const total = safeNumber(booking.total_price ?? booking.price, 0);
                        const paid = safeNumber(booking.amount_paid, 0);
                        const due = Math.max(0, total - paid);
                        const start = parseISO(booking.start_time);
                        const end = parseISO(booking.end_time);

                        return (
                          <tr
                            key={booking.id}
                            className="border-b border-border/60 hover:bg-muted/20"
                          >
                            <td
                              className="cursor-pointer px-3 py-2 align-top"
                              onClick={() => openEditReservation(booking)}
                            >
                              <p className="font-medium text-foreground">{format(start, 'EEE, MMM dd')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                              </p>
                            </td>
                            <td
                              className="cursor-pointer px-3 py-2 align-top"
                              onClick={() => openEditReservation(booking)}
                            >
                              <p className="font-medium text-foreground">{booking.client_name || 'Unnamed guest'}</p>
                              <p className="text-xs text-muted-foreground">{booking.client_email || 'No email'}</p>
                              <p className="text-xs text-muted-foreground">{booking.client_phone || 'No phone'}</p>
                            </td>
                            <td
                              className="cursor-pointer px-3 py-2 align-top text-foreground"
                              onClick={() => openEditReservation(booking)}
                            >
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                {clampInteger(booking.number_of_guests, 0)}
                              </span>
                            </td>
                            <td
                              className="cursor-pointer px-3 py-2 align-top text-foreground"
                              onClick={() => openEditReservation(booking)}
                            >
                              {getBookingMenuName(booking, menuById)}
                            </td>
                            <td
                              className="cursor-pointer px-3 py-2 align-top"
                              onClick={() => openEditReservation(booking)}
                            >
                              <Badge className={cn('border text-xs', getStatusBadgeClass(booking.status))}>
                                {booking.status}
                              </Badge>
                            </td>
                            <td
                              className="cursor-pointer px-3 py-2 align-top"
                              onClick={() => openEditReservation(booking)}
                            >
                              <p className="font-medium text-foreground">{formatCurrency(total)}</p>
                              <p
                                className={cn(
                                  'text-xs',
                                  due > 0
                                    ? 'font-semibold text-amber-700 dark:text-amber-300'
                                    : 'text-muted-foreground'
                                )}
                              >
                                Paid {formatCurrency(paid)} / Due {formatCurrency(due)}
                              </p>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  title="Edit reservation"
                                  onClick={() => openEditReservation(booking)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {canEdit ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                    title="Delete reservation"
                                    onClick={() => {
                                      setDeletingBooking(booking);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="custom-scrollbar h-full overflow-auto p-2">
                <div className="grid gap-3 xl:grid-cols-2">
                  {dualMonthViews.map((monthView) => {
                    const monthReservationCount = monthView.days.reduce((sum, day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      return sum + (bookingsByDayKey.get(key)?.length || 0);
                    }, 0);

                    return (
                      <section
                        key={monthView.label}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                          <p className="text-sm font-semibold text-foreground">{monthView.label}</p>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {monthReservationCount} reservations
                          </p>
                        </div>

                        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/10">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                            <div
                              key={`${monthView.label}-${label}`}
                              className="border-r border-border/80 px-1.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
                            >
                              {label}
                            </div>
                          ))}
                        </div>

                        <div
                          className="grid grid-cols-7"
                          style={{
                            gridTemplateRows: `repeat(${monthView.rowCount}, minmax(82px, 82px))`,
                          }}
                        >
                          {monthView.days.map((day, index) => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const dayBookings = bookingsByDayKey.get(dayKey) || [];
                            const isActiveMonth = isSameMonth(day, monthView.anchorDate);
                            const isSelected = dayKey === selectedDate;
                            const isCurrentDay = isToday(day);
                            const totalPeople = dayBookings.reduce(
                              (sum, booking) => sum + clampInteger(booking.number_of_guests, 0),
                              0
                            );

                            return (
                              <div
                                key={dayKey}
                                className={cn(
                                  'flex h-[82px] cursor-pointer flex-col overflow-hidden border-r border-b border-border/80 p-1.5 transition-colors',
                                  (index + 1) % 7 === 0 && 'border-r-0',
                                  !isActiveMonth && 'bg-muted/10',
                                  dayBookings.length > 0 && 'ring-1 ring-inset ring-primary/30',
                                  isSelected && 'ring-2 ring-inset ring-primary/55',
                                  isCurrentDay && 'ring-1 ring-inset ring-primary/40'
                                )}
                                onClick={() => {
                                  setCalendarDate(day);
                                  setSelectedDate(dayKey);
                                  setDayViewDate(dayKey);
                                  setIsDayViewOpen(true);
                                }}
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <span
                                    className={cn(
                                      'inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : isActiveMonth
                                          ? 'text-foreground'
                                          : 'text-muted-foreground'
                                    )}
                                  >
                                    {format(day, 'd')}
                                  </span>
                                </div>

                                {dayBookings.length > 0 ? (
                                  <div className="mt-auto flex flex-wrap gap-1">
                                    <div className="inline-flex w-fit rounded-full border border-primary/35 bg-primary/12 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                      {dayBookings.length}{' '}
                                      {dayBookings.length === 1 ? 'reservation' : 'reservations'}
                                    </div>
                                    <div className="inline-flex w-fit items-center rounded-full border border-emerald-400/35 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200">
                                      <Users className="mr-1 h-3 w-3" />
                                      {totalPeople} people
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {errorMessage && !showInitialLoading ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open: boolean) => {
          if (open) {
            setIsFormOpen(true);
            return;
          }
          closeForm();
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[97vw] max-w-4xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 shadow-none">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{editingBooking ? 'Edit reservation' : 'New reservation'}</DialogTitle>
            <DialogDescription>
              {editingBooking
                ? `Ref ${editingBooking.id.slice(0, 8).toUpperCase()}`
                : 'Compact reservation form with clear sections for operations.'}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="h-full space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Guest info
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="guest-name">Client name</Label>
                    <Input
                      id="guest-name"
                      className="h-9"
                      value={form.clientName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, clientName: event.target.value }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guest-email">Client email</Label>
                    <Input
                      id="guest-email"
                      className="h-9"
                      type="email"
                      value={form.clientEmail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, clientEmail: event.target.value }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guest-phone">Client phone</Label>
                    <Input
                      id="guest-phone"
                      className="h-9"
                      value={form.clientPhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, clientPhone: event.target.value }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </section>

              <section className="h-full space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Menu and covers
                </p>
                <div>
                  <Label htmlFor="reservation-menu">Menu</Label>
                  <Select
                    value={form.menuId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, menuId: value }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger id="reservation-menu" className="h-9">
                      <SelectValue placeholder="Menu" />
                    </SelectTrigger>
                    <SelectContent>
                      {menus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="covers-adults">Adults</Label>
                    <Input
                      id="covers-adults"
                      className="h-9"
                      type="number"
                      min={0}
                      value={form.adults}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, adults: clampInteger(event.target.value, 0) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="covers-children">Children</Label>
                    <Input
                      id="covers-children"
                      className="h-9"
                      type="number"
                      min={0}
                      value={form.children}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, children: clampInteger(event.target.value, 0) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="covers-seniors">Seniors</Label>
                    <Input
                      id="covers-seniors"
                      className="h-9"
                      type="number"
                      min={0}
                      value={form.seniors}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, seniors: clampInteger(event.target.value, 0) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </section>

              <section className="h-full space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reservation details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="reservation-date">Date</Label>
                    <Input
                      id="reservation-date"
                      className="h-9"
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reservation-time">Time</Label>
                    <Select
                      value={form.time}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, time: value }))}
                      disabled={!canEdit}
                    >
                      <SelectTrigger id="reservation-time" className="h-9">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESTAURANT_TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration-minutes">Duration</Label>
                    <Select
                      value={String(form.durationMinutes)}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, durationMinutes: Number(value) }))
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger id="duration-minutes" className="h-9">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                        <SelectItem value="150">150 min</SelectItem>
                        <SelectItem value="180">180 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reservation-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, status: value as ReservationStatus }))
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger id="reservation-status" className="h-9">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="h-full space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pricing breakdown
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Adults ({Math.max(0, form.adults)}) x {formatCurrency(adultRate)}
                    </span>
                    <span className="text-foreground">{formatCurrency(adultSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Children ({Math.max(0, form.children)}) x {formatCurrency(childRate)}
                    </span>
                    <span className="text-foreground">{formatCurrency(childSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Seniors ({Math.max(0, form.seniors)}) x {formatCurrency(seniorRate)}
                    </span>
                    <span className="text-foreground">{formatCurrency(seniorSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Estimated total</span>
                    <span className="font-semibold text-foreground">{formatCurrency(computedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-semibold text-foreground">{formatCurrency(computedDue)}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount-paid-input">Amount paid</Label>
                  <Input
                    id="amount-paid-input"
                    className="h-9"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountPaid}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amountPaid: safeNumber(event.target.value, 0) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Internal notes
                </p>
                <Textarea
                  id="internal-notes"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Special requests, allergies, internal notes..."
                  className="min-h-[96px]"
                  disabled={!canEdit}
                />
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-card px-6 py-4">
            <div className="flex w-full items-center justify-between gap-2">
              <div>
                {editingBooking && canEdit ? (
                  <Button
                    variant="outline"
                    className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setDeletingBooking(editingBooking);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-xl" onClick={closeForm}>
                  Cancel
                </Button>
                {canEdit ? (
                  <Button className="rounded-xl" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingBooking ? (
                      'Save changes'
                    ) : (
                      'Create reservation'
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDayViewOpen} onOpenChange={setIsDayViewOpen}>
        <DialogContent className="flex max-h-[88vh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 shadow-none">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{dayViewLabel}</DialogTitle>
            <DialogDescription>
              {dayViewBookings.length} reservations | {dayViewStats.totalCovers} people | Due{' '}
              {formatCurrency(dayViewStats.totalDue)}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            {dayViewBookings.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No reservations on this day</p>
                <p className="text-sm text-muted-foreground">
                  Create a reservation for this date or pick another day.
                </p>
                {canEdit ? (
                  <Button
                    className="mt-2 rounded-full px-4"
                    onClick={() => {
                      setIsDayViewOpen(false);
                      setSelectedDate(dayViewDate);
                      setCalendarDate(parseISO(`${dayViewDate}T00:00:00`));
                      openNewReservationForDate(dayViewDate);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New reservation
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {dayViewBookings.map((booking) => {
                  const start = parseISO(booking.start_time);
                  const end = parseISO(booking.end_time);
                  const total = safeNumber(booking.total_price ?? booking.price, 0);
                  const paid = safeNumber(booking.amount_paid, 0);
                  const due = Math.max(0, total - paid);

                  return (
                    <article
                      key={booking.id}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {booking.client_name || 'Unnamed guest'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/14 px-2.5 py-1 text-xs font-bold text-primary">
                              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                              {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/14 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                              <Users className="mr-1.5 h-3.5 w-3.5" />
                              {clampInteger(booking.number_of_guests, 0)} people
                            </span>
                          </div>
                        </div>
                        <Badge className={cn('border text-xs', getStatusBadgeClass(booking.status))}>
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <p className="truncate text-muted-foreground">
                          Menu: {getBookingMenuName(booking, menuById)}
                        </p>
                        <p
                          className={cn(
                            'text-right',
                            due > 0 && booking.status !== 'Cancelled'
                              ? 'font-semibold text-amber-700 dark:text-amber-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          Due {formatCurrency(due)}
                        </p>
                        <p className="truncate text-muted-foreground">
                          {booking.client_email || 'No email'}
                        </p>
                        <p className="truncate text-right text-muted-foreground">
                          {booking.client_phone || 'No phone'}
                        </p>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg"
                          onClick={() => {
                            setIsDayViewOpen(false);
                            openEditReservation(booking);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Open details
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-card px-6 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsDayViewOpen(false)}>
                Close
              </Button>
              {canEdit ? (
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setIsDayViewOpen(false);
                    setSelectedDate(dayViewDate);
                    setCalendarDate(parseISO(`${dayViewDate}T00:00:00`));
                    openNewReservationForDate(dayViewDate);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New reservation
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-border bg-card shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-foreground">
              Delete reservation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently remove the reservation for{' '}
              <strong>{deletingBooking?.client_name || 'this guest'}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl"
              onClick={() => {
                setDeletingBooking(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
