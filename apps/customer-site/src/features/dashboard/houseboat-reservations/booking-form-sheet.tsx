'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CalendarDays, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Booking, Boat, HouseboatModel } from '@/lib/types';
import { calculateHouseboatPrice } from '@/lib/pricing';
import { cn } from '@/lib/utils';

type FormState = {
  houseboatId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  numberOfGuests: number;
  checkInDate?: Date;
  checkInSlot: 'AM' | 'PM';
  checkOutDate?: Date;
  checkOutSlot: 'AM' | 'PM';
  status: 'Pending' | 'Confirmed' | 'Maintenance' | 'Cancelled';
  source: 'manual' | 'website' | 'nicols' | 'amieira' | 'diaria' | 'ancorado';
  price: number;
  discount: number;
  notes: string;
  selectedExtras: string[];
};

type BookingFormSheetProps = {
  mode?: 'quick' | 'full';
  booking?: Booking | null;
  boats: Boat[];
  models: HouseboatModel[];
  prices: Array<{ model_id: string; tariff_id: string; weekday_price: number; weekend_price: number }>;
  tariffs: Array<{ id: string; name: string; periods?: Array<{ start: string; end: string }> }>;
  availableExtras: Array<{ id: string; name: string; price?: number; price_type?: string }>;
  preselectedBoatId?: string;
  preselectedDate?: Date;
  preselectedSlot?: 'AM' | 'PM';
  preselectedEndDate?: Date;
  preselectedEndSlot?: 'AM' | 'PM';
  onClose: () => void;
  onDelete?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenFullEdit?: () => void;
  onSave: (
    booking: Partial<Booking> & { selectedExtras?: string[] },
    options?: { closeAfterSave?: boolean }
  ) => Promise<void>;
};

function toDateTime(date: Date, slot: 'AM' | 'PM') {
  const next = new Date(date);
  if (slot === 'AM') {
    next.setHours(10, 0, 0, 0);
  } else {
    next.setHours(15, 0, 0, 0);
  }
  return next;
}

function isInTariffPeriod(value: string, start: string, end: string) {
  if (!start || !end) return false;
  if (start <= end) {
    return value >= start && value <= end;
  }
  return value >= start || value <= end;
}

function getInitialState(props: {
  booking?: Booking | null;
  preselectedBoatId?: string;
  preselectedDate?: Date;
  preselectedSlot?: 'AM' | 'PM';
  preselectedEndDate?: Date;
  preselectedEndSlot?: 'AM' | 'PM';
}): FormState {
  const {
    booking,
    preselectedBoatId,
    preselectedDate,
    preselectedSlot,
    preselectedEndDate,
    preselectedEndSlot,
  } = props;

  if (booking) {
    const checkIn = parseISO(booking.startTime);
    const checkOut = parseISO(booking.endTime);
    return {
      houseboatId: booking.houseboatId || '',
      clientName: booking.clientName || '',
      clientEmail: booking.clientEmail || '',
      clientPhone: booking.clientPhone || '',
      numberOfGuests: booking.numberOfGuests || 2,
      checkInDate: checkIn,
      checkInSlot: checkIn.getHours() < 12 ? 'AM' : 'PM',
      checkOutDate: checkOut,
      checkOutSlot: checkOut.getHours() < 12 ? 'AM' : 'PM',
      status: booking.status,
      source: (booking.source as FormState['source']) || 'manual',
      price: booking.price || booking.totalPrice || 0,
      discount: booking.discount || 0,
      notes: booking.notes || '',
      selectedExtras: Array.isArray(booking.extras)
        ? booking.extras.map((extra) => (typeof extra === 'string' ? extra : extra.id)).filter(Boolean)
        : [],
    };
  }

  const defaultStart = preselectedDate || new Date();
  return {
    houseboatId: preselectedBoatId || '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    numberOfGuests: 2,
    checkInDate: defaultStart,
    checkInSlot: preselectedSlot || 'PM',
    checkOutDate: preselectedEndDate || addDays(defaultStart, 1),
    checkOutSlot: preselectedEndSlot || 'AM',
    status: 'Pending',
    source: 'manual',
    price: 0,
    discount: 0,
    notes: '',
    selectedExtras: [],
  };
}

export function BookingFormSheet(props: BookingFormSheetProps) {
  const mode = props.mode || 'full';
  const [form, setForm] = useState<FormState>(() => getInitialState(props));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const initialSnapshotRef = useRef<string>(JSON.stringify(getInitialState(props)));
  const {
    booking,
    boats,
    models,
    prices,
    tariffs,
    availableExtras,
    onSave,
    onDelete,
    onClose,
    preselectedBoatId,
    preselectedDate,
    preselectedSlot,
    preselectedEndDate,
    preselectedEndSlot,
    onDirtyChange,
    onOpenFullEdit,
  } = props;

  useEffect(() => {
    const nextInitial = getInitialState({
      booking,
      preselectedBoatId,
      preselectedDate,
      preselectedSlot,
      preselectedEndDate,
      preselectedEndSlot,
    });
    setForm(nextInitial);
    initialSnapshotRef.current = JSON.stringify(nextInitial);
    setHasHydratedDraft(false);
  }, [
    booking,
    preselectedBoatId,
    preselectedDate,
    preselectedSlot,
    preselectedEndDate,
    preselectedEndSlot,
  ]);

  const draftStorageKey = useMemo(
    () => `dashboard:houseboat-reservation:draft:${booking?.id || 'new'}`,
    [booking?.id]
  );

  useEffect(() => {
    if (booking || hasHydratedDraft) return;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) {
        setHasHydratedDraft(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm((prev) => ({
        ...prev,
        ...parsed,
        checkInDate: parsed.checkInDate ? new Date(parsed.checkInDate) : prev.checkInDate,
        checkOutDate: parsed.checkOutDate ? new Date(parsed.checkOutDate) : prev.checkOutDate,
      }));
    } catch {
      // Ignore malformed drafts.
    } finally {
      setHasHydratedDraft(true);
    }
  }, [booking, hasHydratedDraft, draftStorageKey]);

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshotRef.current, [form]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore storage failures.
      }
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            ...form,
            checkInDate: form.checkInDate ? form.checkInDate.toISOString() : undefined,
            checkOutDate: form.checkOutDate ? form.checkOutDate.toISOString() : undefined,
          })
        );
      } catch {
        // Ignore storage failures.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isDirty, form, draftStorageKey]);

  const selectedBoat = useMemo(
    () => boats.find((item) => item.id === form.houseboatId) || null,
    [boats, form.houseboatId]
  );

  const selectedBoatModel = useMemo(() => {
    if (!selectedBoat?.model_id) return null;
    return models.find((model) => model.id === selectedBoat.model_id) || null;
  }, [models, selectedBoat]);

  const bookingWindow = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return null;
    return {
      start: toDateTime(form.checkInDate, form.checkInSlot),
      end: toDateTime(form.checkOutDate, form.checkOutSlot),
    };
  }, [form.checkInDate, form.checkInSlot, form.checkOutDate, form.checkOutSlot]);

  const fieldErrors = useMemo(() => {
    const result: Partial<Record<'houseboatId' | 'clientName' | 'dateWindow', string>> = {};
    if (!form.houseboatId) result.houseboatId = 'Please select a fleet unit.';
    if (!form.clientName.trim()) result.clientName = 'Client name is required.';
    if (!bookingWindow) {
      result.dateWindow = 'Check-in and check-out dates are required.';
    } else if (bookingWindow.end <= bookingWindow.start) {
      result.dateWindow = 'Check-out must be after check-in.';
    }
    return result;
  }, [form.houseboatId, form.clientName, bookingWindow]);

  const validationError = useMemo(
    () => fieldErrors.houseboatId || fieldErrors.clientName || fieldErrors.dateWindow || null,
    [fieldErrors]
  );

  const computedPricing = useMemo(() => {
    if (!selectedBoat || !selectedBoatModel || !form.checkInDate || !form.checkOutDate || !bookingWindow) return null;
    if (bookingWindow.end <= bookingWindow.start) return null;

    const isDayCharter = form.source === 'diaria';
    const bookingType = isDayCharter ? 'day_charter' : 'overnight';
    const checkInToken = format(form.checkInDate, 'MM-dd');

    const appliedTariff =
      tariffs.find((tariff) =>
        (tariff.periods || []).some((period) => isInTariffPeriod(checkInToken, period.start, period.end))
      ) || null;

    const modelPrices = prices.filter((priceItem) => priceItem.model_id === selectedBoat.model_id);
    const selectedPriceRecord =
      (appliedTariff && modelPrices.find((priceItem) => priceItem.tariff_id === appliedTariff.id)) ||
      modelPrices[0] ||
      null;

    const weekdayPrice = Math.max(0, Number(selectedPriceRecord?.weekday_price || 150));
    const weekendPrice = Math.max(0, Number(selectedPriceRecord?.weekend_price || weekdayPrice));

    const baseBreakdown = calculateHouseboatPrice(
      form.checkInDate,
      form.checkOutDate,
      { weekday: weekdayPrice, weekend: weekendPrice },
      bookingType,
      Number(selectedBoatModel.diaria_price || 0)
    );

    const nightlyUnits = Math.max(1, differenceInCalendarDays(form.checkOutDate, form.checkInDate));
    const extrasTotal = availableExtras
      .filter((extra) => form.selectedExtras.includes(extra.id))
      .reduce((sum, extra) => {
        const unit = Math.max(0, Number(extra.price || 0));
        if (extra.price_type === 'per_day') {
          return sum + unit * (isDayCharter ? 1 : nightlyUnits);
        }
        return sum + unit;
      }, 0);

    const subtotal = baseBreakdown.total + extrasTotal;
    const appliedDiscount = Math.max(0, Number(form.discount || 0));
    const total = Math.max(0, subtotal - appliedDiscount);
    const deposit = ['nicols', 'ancorado'].includes(form.source) ? 0 : Math.ceil(total * 0.3);

    return {
      bookingType,
      tariffName: appliedTariff?.name || null,
      weekdayNights: baseBreakdown.weekdayNights,
      weekdayPrice,
      weekendNights: baseBreakdown.weekendNights,
      weekendPrice,
      preparationFee: baseBreakdown.preparationFee,
      baseSubtotal: baseBreakdown.total,
      extrasTotal,
      discount: appliedDiscount,
      total,
      deposit,
    };
  }, [
    selectedBoat,
    selectedBoatModel,
    form.checkInDate,
    form.checkOutDate,
    bookingWindow,
    form.source,
    form.discount,
    form.selectedExtras,
    prices,
    tariffs,
    availableExtras,
  ]);

  useEffect(() => {
    if (!computedPricing) return;
    setForm((prev) => (prev.price === computedPricing.total ? prev : { ...prev, price: computedPricing.total }));
  }, [computedPricing]);

  const handleSubmit = async (closeAfterSave: boolean) => {
    if (validationError || isSubmitting || !bookingWindow || !computedPricing) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        id: booking?.id,
        houseboatId: form.houseboatId,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.trim(),
        numberOfGuests: form.numberOfGuests,
        startTime: bookingWindow.start.toISOString(),
        endTime: bookingWindow.end.toISOString(),
        status: form.status,
        source: form.source,
        notes: form.notes.trim(),
        price: computedPricing.total,
        discount: form.discount,
        selectedExtras: form.selectedExtras,
      };

      await onSave(payload, { closeAfterSave });
      initialSnapshotRef.current = JSON.stringify(form);
      onDirtyChange?.(false);
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore storage failures.
      }
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to save reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card text-foreground">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Houseboat Reservation {mode === 'quick' ? '(Quick edit)' : '(Full edit)'}
            </p>
            <h2 className="text-xl font-semibold">{booking ? 'Edit reservation' : 'Create reservation'}</h2>
            <p className="text-sm text-muted-foreground">
              {booking ? `Ref ${booking.id.slice(0, 8).toUpperCase()}` : 'Manual operational entry'}
            </p>
          </div>
          {mode === 'quick' && onOpenFullEdit ? (
            <Button variant="outline" className="h-9 rounded-full" onClick={onOpenFullEdit}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Full form
            </Button>
          ) : null}
        </div>
        {isDirty ? (
          <p className="mt-2 text-xs text-amber-500">Unsaved changes. A draft is auto-saved locally.</p>
        ) : null}
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
        <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stay details</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fleet unit</Label>
              <Select value={form.houseboatId} onValueChange={(value) => setForm((prev) => ({ ...prev, houseboatId: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-none">
                  <SelectValue placeholder="Select boat" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {boats.map((boat) => {
                    const model = models.find((item) => item.id === boat.model_id);
                    return (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.name} {model ? `(${model.name})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldErrors.houseboatId ? <p className="text-xs text-destructive">{fieldErrors.houseboatId}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Guests</Label>
              <Input
                type="number"
                min={1}
                value={form.numberOfGuests}
                onChange={(event) => setForm((prev) => ({ ...prev, numberOfGuests: Math.max(1, Number(event.target.value) || 1) }))}
                className="h-10 rounded-lg border-border bg-background text-center shadow-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('h-10 w-full justify-start rounded-lg border-border bg-background font-medium shadow-none', !form.checkInDate && 'text-muted-foreground')}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {form.checkInDate ? format(form.checkInDate, 'dd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.checkInDate} onSelect={(date) => setForm((prev) => ({ ...prev, checkInDate: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Check-in slot</Label>
              <Select value={form.checkInSlot} onValueChange={(value: 'AM' | 'PM') => setForm((prev) => ({ ...prev, checkInSlot: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="AM">10:00 AM</SelectItem>
                  <SelectItem value="PM">3:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('h-10 w-full justify-start rounded-lg border-border bg-background font-medium shadow-none', !form.checkOutDate && 'text-muted-foreground')}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {form.checkOutDate ? format(form.checkOutDate, 'dd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.checkOutDate} onSelect={(date) => setForm((prev) => ({ ...prev, checkOutDate: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Check-out slot</Label>
              <Select value={form.checkOutSlot} onValueChange={(value: 'AM' | 'PM') => setForm((prev) => ({ ...prev, checkOutSlot: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="AM">10:00 AM</SelectItem>
                  <SelectItem value="PM">3:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(value: FormState['status']) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Select value={form.source} onValueChange={(value: FormState['source']) => setForm((prev) => ({ ...prev, source: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="manual">Staff</SelectItem>
                  <SelectItem value="amieira">Amieira</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="nicols">Nicols</SelectItem>
                  <SelectItem value="diaria">Diaria</SelectItem>
                  <SelectItem value="ancorado">Ancorado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {fieldErrors.dateWindow ? <p className="text-xs text-destructive">{fieldErrors.dateWindow}</p> : null}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest info</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input value={form.clientName} onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))} className="h-10 rounded-lg border-border bg-background shadow-none" />
            {fieldErrors.clientName ? <p className="text-xs text-destructive">{fieldErrors.clientName}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={form.clientEmail} onChange={(event) => setForm((prev) => ({ ...prev, clientEmail: event.target.value }))} className="h-10 rounded-lg border-border bg-background shadow-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.clientPhone} onChange={(event) => setForm((prev) => ({ ...prev, clientPhone: event.target.value }))} className="h-10 rounded-lg border-border bg-background shadow-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} className="min-h-[88px] rounded-lg border-border bg-background shadow-none" />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & tariff breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Discount (EUR)</Label>
              <Input
                type="number"
                min={0}
                value={form.discount}
                onChange={(event) => setForm((prev) => ({ ...prev, discount: Math.max(0, Number(event.target.value) || 0) }))}
                className="h-10 rounded-lg border-border bg-background shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Calculated total (EUR)</Label>
              <Input
                readOnly
                value={computedPricing ? `EUR ${computedPricing.total.toLocaleString()}` : 'EUR 0'}
                className="h-10 rounded-lg border-border bg-background font-semibold text-foreground shadow-none"
              />
            </div>
          </div>

          {mode === 'full' ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Extras</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableExtras.map((extra) => {
                  const checked = form.selectedExtras.includes(extra.id);
                  return (
                    <label key={extra.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setForm((prev) => ({
                            ...prev,
                            selectedExtras: nextChecked
                              ? [...new Set([...prev.selectedExtras, extra.id])]
                              : prev.selectedExtras.filter((item) => item !== extra.id),
                          }))
                        }
                      />
                      <span className="truncate">{extra.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">EUR {extra.price || 0}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="text-xs text-muted-foreground">Detailed breakdown</p>
            {computedPricing ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium text-foreground">{selectedBoatModel?.name || '-'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Applied tariff</p>
                  <p className="font-medium text-foreground">{computedPricing.tariffName || 'Default'}</p>
                </div>
                {computedPricing.bookingType === 'day_charter' ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Day charter rate</p>
                    <p className="font-medium text-foreground">EUR {computedPricing.baseSubtotal.toLocaleString()}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">
                        Weekdays ({computedPricing.weekdayNights} x EUR {computedPricing.weekdayPrice.toLocaleString()})
                      </p>
                      <p className="font-medium text-foreground">
                        EUR {(computedPricing.weekdayNights * computedPricing.weekdayPrice).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">
                        Weekend ({computedPricing.weekendNights} x EUR {computedPricing.weekendPrice.toLocaleString()})
                      </p>
                      <p className="font-medium text-foreground">
                        EUR {(computedPricing.weekendNights * computedPricing.weekendPrice).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">Preparation fee</p>
                      <p className="font-medium text-foreground">EUR {computedPricing.preparationFee.toLocaleString()}</p>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Extras</p>
                  <p className="font-medium text-foreground">EUR {computedPricing.extrasTotal.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Discount</p>
                  <p className="font-medium text-foreground">- EUR {computedPricing.discount.toLocaleString()}</p>
                </div>
                <div className="my-2 border-t border-border" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment summary</p>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">Estimated total</p>
                  <p className="font-semibold text-foreground">EUR {computedPricing.total.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Deposit due today</p>
                  <p className="font-medium text-foreground">EUR {computedPricing.deposit.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Select a boat and valid dates to see the pricing breakdown.</p>
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
        {validationError ? <p className="mb-2 text-xs text-destructive">{validationError}</p> : null}
        {submitError ? <p className="mb-2 text-xs text-destructive">{submitError}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-11 rounded-xl" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || Boolean(validationError) || !computedPricing}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
          <Button
            className="h-11 rounded-xl"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || Boolean(validationError) || !computedPricing}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save & close
          </Button>
        </div>
        {booking && onDelete ? (
          <Button
            variant="outline"
            className="mt-2 h-10 w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete reservation
          </Button>
        ) : null}
      </div>
    </div>
  );
}
