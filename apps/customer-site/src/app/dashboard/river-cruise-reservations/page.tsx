'use client';

import { type ElementType, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  addHours,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabase, useAuth } from '@/components/providers/supabase-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/actions';
import { sendBookingStatusUpdateEmail } from '@/lib/email';
import { canEditRiverCruiseReservations as canEditRiverCruiseReservationsFromPermissions } from '@/lib/auth/permissions';

type BookingStatus = 'Confirmed' | 'Pending' | 'Maintenance' | 'Cancelled';
type ViewMode = 'table' | 'calendar';

type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time?: string | null;
  notes?: string | null;
  status: string;
  source?: string | null;
  booking_type?: string | null;
  daily_travel_package_id?: string | null;
  daily_boat_id?: string | null;
  number_of_guests?: number | null;
  adults?: number | null;
  children?: number | null;
  seniors?: number | null;
  total_price?: number | null;
  price?: number | null;
  amount_paid?: number | null;
  payment_status?: string | null;
};

type RiverCruisePricingTier = {
  withoutFood?: number | null;
  withFood?: number | null;
};

type RiverCruisePricing = {
  type?: 'per-person' | 'exclusive' | string;
  adults?: RiverCruisePricingTier | null;
  children?: RiverCruisePricingTier | null;
  seniors?: RiverCruisePricingTier | null;
  totalPrice?: number | null;
};

type RiverCruisePackage = {
  id: string;
  name: string;
  duration_hours?: number | null;
  min_capacity?: number | null;
  pricing?: RiverCruisePricing | null;
};

type PaymentTransactionRow = {
  id: string;
  booking_id: string;
  amount?: number | null;
  status?: string | null;
};

type CruiseFormState = {
  id?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  packageId: string;
  adults: number;
  children: number;
  seniors: number;
  status: BookingStatus;
  source: string;
  totalPrice: number;
  amountPaid: number;
  notes: string;
};

type UserPermissions = {
  isSuperAdmin?: boolean;
  canEditRiverCruiseReservations?: boolean;
};

type UserProfile = {
  id: string;
  username: string;
  permissions: UserPermissions;
};

const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Maintenance', 'Cancelled'];

const statusStyles: Record<BookingStatus, { icon: ElementType; className: string }> = {
  Confirmed: {
    icon: CheckCircle,
    className: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  },
  Pending: {
    icon: Clock,
    className: 'border-amber-400/50 bg-amber-400/20 text-amber-700 dark:text-amber-200',
  },
  Maintenance: {
    icon: AlertCircle,
    className: 'border-zinc-500/60 bg-zinc-500/15 text-zinc-700 dark:text-zinc-200',
  },
  Cancelled: {
    icon: XCircle,
    className: 'border-rose-400/45 bg-rose-500/15 text-rose-700 dark:text-rose-200',
  },
};

function guestsCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number) {
  return `EUR ${Math.max(0, value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeStatus(value: unknown): BookingStatus {
  const next = String(value || '');
  return BOOKING_STATUSES.includes(next as BookingStatus) ? (next as BookingStatus) : 'Pending';
}

function parseStatusFilter(value: string | null): 'all' | BookingStatus {
  if (!value) return 'all';
  return BOOKING_STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : 'all';
}

function summarize(rows: Booking[]) {
  return {
    total: rows.length,
    pending: rows.filter((row) => normalizeStatus(row.status) === 'Pending').length,
    guests: rows.reduce((sum, row) => sum + guestsCount(row.number_of_guests), 0),
  };
}

function getDurationHours(pkg?: RiverCruisePackage | null) {
  return Math.max(1, safeNumber(pkg?.duration_hours, 1));
}

function getComputedPackageTotal(form: CruiseFormState, pkg?: RiverCruisePackage | null) {
  if (!pkg?.pricing) {
    return Math.max(0, safeNumber(form.totalPrice, 0));
  }

  const pricing = pkg.pricing;
  const pricingType = String(pricing.type || '').toLowerCase();
  if (pricingType === 'exclusive') {
    const exclusiveTotal = safeNumber(pricing.totalPrice, safeNumber(form.totalPrice, 0));
    return Math.max(0, exclusiveTotal);
  }

  const adultsRate = safeNumber(pricing.adults?.withoutFood, 0);
  const childrenRate = safeNumber(pricing.children?.withoutFood, 0);
  const seniorsRate = safeNumber(pricing.seniors?.withoutFood, adultsRate);

  const subtotal =
    Math.max(0, form.adults) * adultsRate +
    Math.max(0, form.children) * childrenRate +
    Math.max(0, form.seniors) * seniorsRate;

  if (subtotal > 0) return subtotal;
  return Math.max(0, safeNumber(form.totalPrice, 0));
}

function createDefaultForm(selectedDate: string, defaultPackageId = ''): CruiseFormState {
  return {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: selectedDate,
    time: '14:00',
    packageId: defaultPackageId,
    adults: 2,
    children: 0,
    seniors: 0,
    status: 'Pending',
    source: 'Staff Manual - River Cruise',
    totalPrice: 0,
    amountPaid: 0,
    notes: '',
  };
}

export default function RiverCruiseReservationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<RiverCruisePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>(
    parseStatusFilter(searchParams.get('status'))
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get('view') === 'calendar' ? 'calendar' : 'table'
  );
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(() =>
    parseISO(`${searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')}T00:00:00`)
  );
  const [form, setForm] = useState<CruiseFormState>(() =>
    createDefaultForm(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'))
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(localSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [localSearch]);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    const nextStatus = parseStatusFilter(searchParams.get('status'));
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
    if (selectedDate) nextParams.set('date', selectedDate);
    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [router, pathname, searchParams, searchTerm, statusFilter, viewMode, selectedDate]);

  useEffect(() => {
    if (!supabase || !user) return;
    let mounted = true;
    const run = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (mounted && data) setUserProfile(data as UserProfile);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!supabase) return;
      if (opts?.silent) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage(null);
      try {
        const [bookingsRes, packagesRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(
              'id,client_name,client_email,client_phone,start_time,end_time,notes,status,source,booking_type,daily_travel_package_id,daily_boat_id,number_of_guests,adults,children,seniors,total_price,price,amount_paid,payment_status'
            )
            .not('daily_travel_package_id', 'is', null)
            .order('start_time', { ascending: true }),
          supabase.from('daily_travel_packages').select('id,name,duration_hours,min_capacity,pricing'),
        ]);
        if (bookingsRes.error) throw bookingsRes.error;
        if (packagesRes.error) throw packagesRes.error;
        setBookings((bookingsRes.data || []) as Booking[]);
        setPackages((packagesRes.data || []) as RiverCruisePackage[]);
      } catch (error: any) {
        const msg = error?.message || 'Failed to load river cruise reservations.';
        setErrorMessage(msg);
        toast({ variant: 'destructive', title: 'Load failed', description: msg });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [supabase, toast]
  );

  useEffect(() => {
    void fetchData();
    if (!supabase) return;
    const channel = supabase
      .channel('daily_travel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void fetchData({ silent: true });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_travel_packages' },
        () => {
          void fetchData({ silent: true });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  const canEditByPermission = canEditRiverCruiseReservationsFromPermissions(userProfile);
  const canEdit = canEditByPermission || Boolean(user);
  const packageMap = useMemo(() => new Map(packages.map((item) => [item.id, item.name])), [packages]);

  useEffect(() => {
    if (form.packageId || packages.length === 0) return;
    setForm((prev) => ({ ...prev, packageId: packages[0].id }));
  }, [packages, form.packageId]);

  const filteredBookings = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return bookings
      .filter((booking) => {
        const status = normalizeStatus(booking.status);
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (!query) return true;
        const packageName = booking.daily_travel_package_id
          ? packageMap.get(booking.daily_travel_package_id) || 'Unknown package'
          : '';
        const haystack = [
          booking.id,
          booking.client_name || '',
          booking.client_email || '',
          booking.client_phone || '',
          packageName,
          status,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [bookings, packageMap, searchTerm, statusFilter]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of filteredBookings) {
      const key = format(parseISO(booking.start_time), 'yyyy-MM-dd');
      const list = map.get(key);
      if (list) list.push(booking);
      else map.set(key, [booking]);
    }
    return map;
  }, [filteredBookings]);

  const monthAnchor = useMemo(
    () => calendarDate ?? parseISO(`${selectedDate}T00:00:00`),
    [calendarDate, selectedDate]
  );
  const nextMonthAnchor = useMemo(() => addMonths(monthAnchor, 1), [monthAnchor]);
  const monthRangeLabel = `${format(monthAnchor, 'MMM yyyy')} - ${format(nextMonthAnchor, 'MMM yyyy')}`;
  const monthViews = useMemo(
    () =>
      [monthAnchor, nextMonthAnchor].map((anchorDate) => {
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
    [monthAnchor, nextMonthAnchor]
  );

  const listStats = useMemo(() => summarize(filteredBookings), [filteredBookings]);
  const dayBookings = useMemo(() => bookingsByDay.get(dayViewDate) || [], [bookingsByDay, dayViewDate]);
  const dayStats = useMemo(() => summarize(dayBookings), [dayBookings]);
  const dayLabel = useMemo(
    () => format(parseISO(`${dayViewDate}T00:00:00`), 'EEEE, MMMM dd, yyyy'),
    [dayViewDate]
  );
  const showInitialLoading = isLoading && bookings.length === 0;

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === form.packageId) || null,
    [packages, form.packageId]
  );
  const partySize =
    Math.max(0, form.adults) + Math.max(0, form.children) + Math.max(0, form.seniors);
  const computedTotal = useMemo(
    () => getComputedPackageTotal(form, selectedPackage),
    [form, selectedPackage]
  );
  const computedDue = useMemo(
    () => Math.max(0, computedTotal - Math.max(0, safeNumber(form.amountPaid, 0))),
    [computedTotal, form.amountPaid]
  );
  const selectedPackageDurationHours = useMemo(
    () => getDurationHours(selectedPackage),
    [selectedPackage]
  );
  const packagePricingType = String(selectedPackage?.pricing?.type || '').toLowerCase();
  const adultRate = safeNumber(selectedPackage?.pricing?.adults?.withoutFood, 0);
  const childRate = safeNumber(selectedPackage?.pricing?.children?.withoutFood, 0);
  const seniorRate = safeNumber(selectedPackage?.pricing?.seniors?.withoutFood, adultRate);
  const packageHasStructuredPricing = useMemo(() => {
    if (!selectedPackage?.pricing) return false;
    if (packagePricingType === 'exclusive') {
      return safeNumber(selectedPackage.pricing.totalPrice, 0) > 0;
    }
    return adultRate > 0 || childRate > 0 || seniorRate > 0;
  }, [adultRate, childRate, packagePricingType, selectedPackage, seniorRate]);

  const showPermissionDenied = useCallback(() => {
    toast({
      variant: 'destructive',
      title: 'Permission denied',
      description: "You don't have permission to perform this action.",
    });
  }, [toast]);

  const openNewReservation = useCallback(
    (dateOverride?: string) => {
      const targetDate = dateOverride || selectedDate || format(new Date(), 'yyyy-MM-dd');
      setEditingBooking(null);
      setFormErrors({});
      setForm(createDefaultForm(targetDate, packages[0]?.id || ''));
      setIsFormOpen(true);
    },
    [packages, selectedDate]
  );

  const openEditReservation = useCallback(
    (booking: Booking) => {
      const start = parseISO(booking.start_time);
      const bookingAdults = guestsCount(booking.adults);
      const bookingChildren = guestsCount(booking.children);
      const bookingSeniors = guestsCount(booking.seniors);
      const fallbackGuests = guestsCount(booking.number_of_guests);
      const ageBreakdownTotal = bookingAdults + bookingChildren + bookingSeniors;
      const resolvedAdults =
        ageBreakdownTotal > 0 ? bookingAdults : Math.max(1, fallbackGuests);

      setEditingBooking(booking);
      setFormErrors({});
      setForm({
        id: booking.id,
        clientName: booking.client_name || '',
        clientEmail: booking.client_email || '',
        clientPhone: booking.client_phone || '',
        date: format(start, 'yyyy-MM-dd'),
        time: format(start, 'HH:mm'),
        packageId: booking.daily_travel_package_id || packages[0]?.id || '',
        adults: resolvedAdults,
        children: ageBreakdownTotal > 0 ? bookingChildren : 0,
        seniors: ageBreakdownTotal > 0 ? bookingSeniors : 0,
        status: normalizeStatus(booking.status),
        source: booking.source || 'Staff Manual - River Cruise',
        totalPrice: Math.max(0, safeNumber(booking.total_price ?? booking.price, 0)),
        amountPaid: Math.max(0, safeNumber(booking.amount_paid, 0)),
        notes: booking.notes || '',
      });
      setIsFormOpen(true);
    },
    [packages]
  );

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingBooking(null);
    setFormErrors({});
  }, []);

  useEffect(() => {
    if (searchParams.get('action') !== 'new') return;
    if (!canEdit) return;

    openNewReservation(searchParams.get('date') || selectedDate);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [canEdit, openNewReservation, pathname, router, searchParams, selectedDate]);

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
      showPermissionDenied();
      return;
    }

    const errors: Record<string, string> = {};
    if (!form.clientName.trim()) errors.clientName = 'Required';
    if (!form.clientEmail.trim()) errors.clientEmail = 'Required';
    if (!form.date) errors.date = 'Required';
    if (!form.time) errors.time = 'Required';
    if (!form.packageId) errors.packageId = 'Required';
    if (partySize <= 0) errors.guests = 'At least one guest is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please fill the required fields before saving.',
      });
      return;
    }

    const start = parseISO(`${form.date}T${form.time}:00`);
    if (Number.isNaN(start.getTime())) {
      setFormErrors({ date: 'Invalid date/time', time: 'Invalid date/time' });
      toast({
        variant: 'destructive',
        title: 'Invalid schedule',
        description: 'Could not parse reservation date and time.',
      });
      return;
    }

    const end = addHours(start, selectedPackageDurationHours);
    const targetPaid = Math.max(0, safeNumber(form.amountPaid, 0));
    const total = Math.max(0, computedTotal);
    const paymentStatus =
      total <= 0
        ? 'unpaid'
        : targetPaid >= total - 0.05
          ? 'fully_paid'
          : targetPaid >= total * 0.3
            ? 'deposit_paid'
            : 'unpaid';

    const payload = {
      client_name: form.clientName.trim(),
      client_email: form.clientEmail.trim(),
      client_phone: form.clientPhone.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes: form.notes.trim() || null,
      status: form.status,
      source: form.source.trim() || 'Staff Manual - River Cruise',
      booking_type: 'day_charter',
      daily_travel_package_id: form.packageId,
      number_of_guests: partySize,
      adults: Math.max(0, form.adults),
      children: Math.max(0, form.children),
      seniors: Math.max(0, form.seniors),
      total_price: total,
      price: total,
      amount_paid: targetPaid,
      payment_status: paymentStatus,
    };

    setIsSaving(true);
    try {
      let bookingId = editingBooking?.id;
      const previousPaid = Math.max(0, safeNumber(editingBooking?.amount_paid, 0));

      if (editingBooking) {
        const { error } = await supabase.from('bookings').update(payload).eq('id', editingBooking.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        bookingId = data?.id;
      }

      if (!bookingId) {
        throw new Error('Could not resolve booking id after save.');
      }

      const paymentSyncWarning = await syncPaidAmountWithLedger(bookingId, targetPaid, previousPaid);

      await fetchData({ silent: true });
      closeForm();

      toast({
        title: editingBooking ? 'Reservation updated' : 'Reservation created',
        description: paymentSyncWarning
          ? `Saved successfully. Payment sync warning: ${paymentSyncWarning}`
          : 'Saved successfully.',
      });

      if (user) {
        const username = userProfile?.username || user.email || 'staff';
        void logActivity({
          userId: user.id,
          username,
          action: editingBooking ? 'update_daily_travel_booking' : 'create_daily_travel_booking',
          details: `${editingBooking ? 'Updated' : 'Created'} river cruise booking for ${form.clientName}`,
        });
      }
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
    canEdit,
    closeForm,
    computedTotal,
    editingBooking,
    fetchData,
    form,
    isSaving,
    partySize,
    selectedPackageDurationHours,
    showPermissionDenied,
    supabase,
    syncPaidAmountWithLedger,
    toast,
    user,
    userProfile?.username,
  ]);

  const handleStatusChange = async (booking: Booking, status: BookingStatus) => {
    if (!canEdit) {
      showPermissionDenied();
      return;
    }
    if (!supabase || !user || !userProfile) return;
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
      if (error) throw error;
      setBookings((rows) => rows.map((row) => (row.id === booking.id ? { ...row, status } : row)));
      toast({ title: 'Status updated', description: `Reservation moved to ${status}.` });
      void logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'update_daily_travel_status',
        details: `Set status to ${status} for ${booking.client_name}'s river cruise booking`,
      });
      if (status === 'Confirmed' || status === 'Cancelled') {
        const emailBooking = {
          ...booking,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          clientPhone: booking.client_phone,
          startTime: booking.start_time,
        };
        void sendBookingStatusUpdateEmail(emailBooking as any, status);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update reservation status.',
      });
    }
  };

  const handleDelete = async () => {
    if (!canEdit) {
      showPermissionDenied();
      setDeletingId(null);
      return;
    }
    if (!supabase || !deletingId || !user || !userProfile) return;
    const target = bookings.find((row) => row.id === deletingId);
    if (!target) {
      setDeletingId(null);
      return;
    }
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', deletingId);
      if (error) throw error;
      setBookings((rows) => rows.filter((row) => row.id !== deletingId));
      toast({ title: 'Deleted', description: 'Reservation was removed.' });
      void logActivity({
        userId: user.id,
        username: userProfile.username,
        action: 'delete_daily_travel_booking',
        details: `Deleted river cruise booking for ${target.client_name}`,
      });
      setDeletingId(null);
    } catch {
      toast({ variant: 'destructive', title: 'Delete failed', description: 'Failed to delete reservation.' });
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Search client, email, phone or package..."
              className="h-10 rounded-xl border-border bg-background pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(parseStatusFilter(value))}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl border-border bg-background">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {BOOKING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex h-10 items-center rounded-xl border border-border bg-background p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-lg px-3',
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
                'h-8 rounded-lg px-3',
                viewMode === 'calendar' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Month
            </Button>
          </div>

          {viewMode === 'calendar' ? (
            <div className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => {
                  const next = addMonths(monthAnchor, -1);
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
                className="h-8 w-8 rounded-lg"
                onClick={() => {
                  const next = addMonths(monthAnchor, 1);
                  setCalendarDate(next);
                  setSelectedDate(format(next, 'yyyy-MM-dd'));
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <Button
            variant="outline"
            className="h-10 rounded-xl border-border bg-background px-4"
            onClick={() => {
              const now = new Date();
              setCalendarDate(now);
              setSelectedDate(format(now, 'yyyy-MM-dd'));
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>

          <Button
            variant="outline"
            className="h-10 rounded-xl border-border bg-background px-4"
            onClick={() => void fetchData({ silent: true })}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>

          {canEdit ? (
            <Button className="h-10 rounded-xl px-5" onClick={() => openNewReservation()}>
              <Plus className="mr-2 h-4 w-4" />
              New reservation
            </Button>
          ) : null}
        </div>

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="space-y-2 border-b border-border px-5 py-4">
            <CardTitle className="text-[30px] font-semibold tracking-tight">River cruise reservations</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {viewMode === 'table'
                ? `${listStats.total} reservations | ${listStats.pending} pending | ${listStats.guests} guests`
                : `${listStats.total} reservations | ${listStats.pending} pending | ${monthRangeLabel}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[calc(100vh-260px)] min-h-[420px] p-0">
            {showInitialLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <div className="custom-scrollbar h-full overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Client</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Date & time</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="w-[72px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => {
                        const status = normalizeStatus(booking.status);
                        const statusConfig = statusStyles[status];
                        const StatusIcon = statusConfig.icon;
                        const packageName = booking.daily_travel_package_id
                          ? packageMap.get(booking.daily_travel_package_id) || 'Unknown package'
                          : 'No package';
                        const total = Math.max(0, safeNumber(booking.total_price ?? booking.price, 0));
                        const paid = Math.max(0, safeNumber(booking.amount_paid, 0));
                        const due = Math.max(0, total - paid);
                        return (
                          <TableRow key={booking.id} className="hover:bg-muted/20">
                            <TableCell
                              className={cn('align-top', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <p className="font-medium text-foreground">{booking.client_name || 'Unnamed client'}</p>
                              <p className="text-xs text-muted-foreground">Ref {booking.id.slice(0, 8).toUpperCase()}</p>
                            </TableCell>
                            <TableCell
                              className={cn('align-top text-foreground', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              {packageName}
                            </TableCell>
                            <TableCell
                              className={cn('align-top', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <p className="text-sm font-medium text-foreground">
                                {format(parseISO(booking.start_time), 'EEE, MMM dd, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(booking.start_time), 'HH:mm')}
                                {booking.end_time ? ` - ${format(parseISO(booking.end_time), 'HH:mm')}` : ''}
                              </p>
                            </TableCell>
                            <TableCell
                              className={cn('align-top text-foreground', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <span className="inline-flex items-center gap-1 text-sm font-medium">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                {guestsCount(booking.number_of_guests)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={cn('align-top', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <Badge variant="outline" className={cn('gap-1.5 border text-xs', statusConfig.className)}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status}
                              </Badge>
                              {status === 'Pending' ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDistanceToNow(parseISO(booking.start_time), { addSuffix: true })}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell
                              className={cn('align-top', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {formatCurrency(total)}
                              </p>
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
                            </TableCell>
                            <TableCell
                              className={cn('align-top', canEdit && 'cursor-pointer')}
                              onClick={canEdit ? () => openEditReservation(booking) : undefined}
                            >
                              <p className="inline-flex items-center gap-1 text-xs text-foreground">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                {booking.client_email || 'No email'}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {booking.client_phone || 'No phone'}
                              </p>
                            </TableCell>
                            <TableCell className="align-top text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={!canEdit}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  {BOOKING_STATUSES.filter((next) => next !== status).map((next) => {
                                    const Icon = statusStyles[next].icon;
                                    return (
                                      <DropdownMenuItem
                                        key={`${booking.id}-${next}`}
                                        onSelect={() => void handleStatusChange(booking, next)}
                                      >
                                        <Icon className="mr-2 h-4 w-4" />
                                        Mark as {next}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                  <DropdownMenuItem onSelect={() => openEditReservation(booking)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onSelect={() => setDeletingId(booking.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40">
                          <div className="flex flex-col items-center justify-center gap-3 text-center">
                            <p className="text-sm text-muted-foreground">
                              No river cruise reservations found.
                            </p>
                            {canEdit ? (
                              <Button className="h-9 rounded-xl px-4" onClick={() => openNewReservation()}>
                                <Plus className="mr-2 h-4 w-4" />
                                New reservation
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="custom-scrollbar h-full overflow-auto p-2">
                <div className="grid gap-3 xl:grid-cols-2">
                  {monthViews.map((monthView) => {
                    const monthCount = monthView.days.reduce((sum, day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      return sum + (bookingsByDay.get(key)?.length || 0);
                    }, 0);
                    return (
                      <section key={monthView.label} className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border/80 px-3 py-2">
                          <p className="text-sm font-semibold text-foreground">{monthView.label}</p>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {monthCount} reservations
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
                          style={{ gridTemplateRows: `repeat(${monthView.rowCount}, minmax(76px, 76px))` }}
                        >
                          {monthView.days.map((day, index) => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const dayRows = bookingsByDay.get(dayKey) || [];
                            const totalPeople = dayRows.reduce((sum, row) => sum + guestsCount(row.number_of_guests), 0);
                            const inMonth = isSameMonth(day, monthView.anchorDate);
                            const isSelected = dayKey === selectedDate;
                            return (
                              <div
                                key={dayKey}
                                className={cn(
                                  'flex h-[76px] cursor-pointer flex-col overflow-hidden border-b border-r border-border/80 p-1.5 transition-colors',
                                  (index + 1) % 7 === 0 && 'border-r-0',
                                  !inMonth && 'bg-muted/10',
                                  dayRows.length > 0 && 'ring-1 ring-inset ring-primary/35',
                                  isSelected && 'ring-2 ring-inset ring-primary/60',
                                  isToday(day) && 'ring-1 ring-inset ring-primary/45'
                                )}
                                onClick={() => {
                                  setCalendarDate(day);
                                  setSelectedDate(dayKey);
                                  setDayViewDate(dayKey);
                                  setIsDayViewOpen(true);
                                }}
                              >
                                <span
                                  className={cn(
                                    'inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : inMonth
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                  )}
                                >
                                  {format(day, 'd')}
                                </span>
                                {dayRows.length > 0 ? (
                                  <div className="mt-auto flex flex-wrap gap-1">
                                    <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/12 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                      {dayRows.length} {dayRows.length === 1 ? 'reservation' : 'reservations'}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200">
                                      <Users className="mr-1 h-3 w-3" />
                                      {totalPeople}
                                    </span>
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

      <Dialog open={isDayViewOpen} onOpenChange={setIsDayViewOpen}>
        <DialogContent className="flex max-h-[88vh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 shadow-none">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{dayLabel}</DialogTitle>
            <DialogDescription>
              {dayStats.total} reservations | {dayStats.pending} pending | {dayStats.guests} guests
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-auto p-4">
            {dayBookings.length > 0 ? (
              dayBookings.map((booking) => {
                const status = normalizeStatus(booking.status);
                const statusConfig = statusStyles[status];
                const Icon = statusConfig.icon;
                const packageName = booking.daily_travel_package_id
                  ? packageMap.get(booking.daily_travel_package_id) || 'Unknown package'
                  : 'No package';
                const total = Math.max(0, safeNumber(booking.total_price ?? booking.price, 0));
                const paid = Math.max(0, safeNumber(booking.amount_paid, 0));
                const due = Math.max(0, total - paid);
                return (
                  <article key={booking.id} className="rounded-xl border border-border bg-muted/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">{booking.client_name || 'Unnamed client'}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">
                            <Clock className="mr-1.5 h-4 w-4" />
                            {format(parseISO(booking.start_time), 'HH:mm')}
                            {booking.end_time ? ` - ${format(parseISO(booking.end_time), 'HH:mm')}` : ''}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            <Users className="mr-1.5 h-4 w-4" />
                            {guestsCount(booking.number_of_guests)} people
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{packageName}</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {booking.client_email || 'No email'}
                          </p>
                          <p className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {booking.client_phone || 'No phone'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <Badge variant="outline" className={cn('gap-1.5 border text-xs', statusConfig.className)}>
                          <Icon className="h-3.5 w-3.5" />
                          {status}
                        </Badge>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(total)}</p>
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
                        {canEdit ? (
                          <Button
                            variant="outline"
                            className="h-8 rounded-xl border-border bg-background px-3 text-xs"
                            onClick={() => {
                              setIsDayViewOpen(false);
                              openEditReservation(booking);
                            }}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Open details
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <p>No reservations on this day.</p>
                {canEdit ? (
                  <Button
                    className="h-9 rounded-xl px-4"
                    onClick={() => {
                      setIsDayViewOpen(false);
                      openNewReservation(dayViewDate);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New reservation
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" className="h-10 rounded-xl border-border bg-background px-5" onClick={() => setIsDayViewOpen(false)}>
              Close
            </Button>
            {canEdit ? (
              <Button
                className="h-10 rounded-xl px-5"
                onClick={() => {
                  setIsDayViewOpen(false);
                  openNewReservation(dayViewDate);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New reservation
              </Button>
            ) : null}
            <Button className="h-10 rounded-xl px-5" onClick={() => { setViewMode('table'); setIsDayViewOpen(false); }}>
              <Table2 className="mr-2 h-4 w-4" />
              Open table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsFormOpen(true);
            return;
          }
          closeForm();
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[97vw] max-w-5xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 shadow-none">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{editingBooking ? 'Edit river cruise reservation' : 'New river cruise reservation'}</DialogTitle>
            <DialogDescription>
              {editingBooking
                ? `Ref ${editingBooking.id.slice(0, 8).toUpperCase()}`
                : 'Compact operations form with guest, cruise, and payment sections.'}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest info</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="river-client-name">Client name</Label>
                    <Input
                      id="river-client-name"
                      value={form.clientName}
                      className={cn('h-9', formErrors.clientName && 'border-destructive')}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, clientName: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, clientName: '' }));
                      }}
                      disabled={!canEdit}
                    />
                    {formErrors.clientName ? (
                      <p className="mt-1 text-xs text-destructive">{formErrors.clientName}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="river-client-email">Client email</Label>
                    <Input
                      id="river-client-email"
                      type="email"
                      value={form.clientEmail}
                      className={cn('h-9', formErrors.clientEmail && 'border-destructive')}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, clientEmail: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, clientEmail: '' }));
                      }}
                      disabled={!canEdit}
                    />
                    {formErrors.clientEmail ? (
                      <p className="mt-1 text-xs text-destructive">{formErrors.clientEmail}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="river-client-phone">Client phone</Label>
                    <Input
                      id="river-client-phone"
                      value={form.clientPhone}
                      className="h-9"
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, clientPhone: event.target.value }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cruise details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="river-package">Package</Label>
                    <Select
                      value={form.packageId}
                      onValueChange={(value) => {
                        setForm((prev) => ({ ...prev, packageId: value }));
                        setFormErrors((prev) => ({ ...prev, packageId: '' }));
                      }}
                      disabled={!canEdit}
                    >
                      <SelectTrigger
                        id="river-package"
                        className={cn('h-9', formErrors.packageId && 'border-destructive')}
                      >
                        <SelectValue placeholder="Select a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.packageId ? (
                      <p className="mt-1 text-xs text-destructive">{formErrors.packageId}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="river-date">Date</Label>
                    <Input
                      id="river-date"
                      type="date"
                      value={form.date}
                      className={cn('h-9', formErrors.date && 'border-destructive')}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, date: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, date: '' }));
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="river-time">Time</Label>
                    <Input
                      id="river-time"
                      type="time"
                      value={form.time}
                      className={cn('h-9', formErrors.time && 'border-destructive')}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, time: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, time: '' }));
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="river-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          status: normalizeStatus(value),
                        }))
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger id="river-status" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="river-duration">Duration</Label>
                    <Input
                      id="river-duration"
                      value={`${selectedPackageDurationHours} hour${selectedPackageDurationHours === 1 ? '' : 's'}`}
                      className="h-9"
                      disabled
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="river-source">Source</Label>
                    <Input
                      id="river-source"
                      value={form.source}
                      className="h-9"
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, source: event.target.value }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guests</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="river-adults">Adults</Label>
                    <Input
                      id="river-adults"
                      type="number"
                      min={0}
                      value={form.adults}
                      className={cn('h-9', formErrors.guests && 'border-destructive')}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, adults: guestsCount(event.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="river-children">Children</Label>
                    <Input
                      id="river-children"
                      type="number"
                      min={0}
                      value={form.children}
                      className="h-9"
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, children: guestsCount(event.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="river-seniors">Seniors</Label>
                    <Input
                      id="river-seniors"
                      type="number"
                      min={0}
                      value={form.seniors}
                      className="h-9"
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, seniors: guestsCount(event.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                {formErrors.guests ? (
                  <p className="text-xs text-destructive">{formErrors.guests}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">Total guests: {partySize}</p>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & payment</p>
                <div className="space-y-2 rounded-lg border border-border/70 bg-card p-3">
                  {packagePricingType === 'exclusive' ? (
                    <p className="text-sm text-muted-foreground">
                      Exclusive package pricing is applied.
                    </p>
                  ) : (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Adults: {form.adults} x {formatCurrency(adultRate)}</p>
                      <p>Children: {form.children} x {formatCurrency(childRate)}</p>
                      <p>Seniors: {form.seniors} x {formatCurrency(seniorRate)}</p>
                    </div>
                  )}
                  <div className="border-t border-border/70 pt-2 text-sm font-semibold text-foreground">
                    Estimated total: {formatCurrency(computedTotal)}
                  </div>
                </div>
                <div>
                  <Label htmlFor="river-total">Total amount</Label>
                  <Input
                    id="river-total"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.totalPrice}
                    className="h-9"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, totalPrice: Math.max(0, safeNumber(event.target.value, 0)) }))
                    }
                    disabled={!canEdit || packageHasStructuredPricing}
                  />
                  {packageHasStructuredPricing ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Total is computed from package pricing.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="river-paid">Amount paid</Label>
                  <Input
                    id="river-paid"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountPaid}
                    className="h-9"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amountPaid: Math.max(0, safeNumber(event.target.value, 0)) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    computedDue > 0
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  Due: {formatCurrency(computedDue)}
                </p>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</p>
                <Textarea
                  value={form.notes}
                  placeholder="Operational notes, special requests, reminders..."
                  className="min-h-[90px]"
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  disabled={!canEdit}
                />
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-card px-6 py-4">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-border bg-background px-5"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button className="h-10 rounded-xl px-5" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingBooking ? 'Save changes' : 'Create reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="border border-border bg-card shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently remove this river cruise booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-background">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
