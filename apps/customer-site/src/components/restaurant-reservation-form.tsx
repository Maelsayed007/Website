'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, Clock, Loader2, Search, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/providers/supabase-provider';
import { cn } from '@/lib/utils';
import {
  getAvailabilityReasonText,
  isRestaurantClosedDay,
  parseInputDate,
  RESTAURANT_TIME_OPTIONS,
  RestaurantAvailabilityPayload,
  RestaurantMenuOption,
  RestaurantQuickDraft,
} from './restaurant-booking.types';

const reservationSchema = z
  .object({
    clientName: z.string().min(2, 'Name is required.'),
    clientEmail: z.string().email('Valid email is required.'),
    clientPhone: z.string().optional(),
    date: z.date({ required_error: 'A date is required.' }),
    time: z.string().min(1, 'A time is required.'),
    menuId: z.string().min(1, 'Please select a menu.'),
    adults: z.coerce.number().int().min(0),
    children: z.coerce.number().int().min(0),
    seniors: z.coerce.number().int().min(0),
  })
  .refine((values) => values.adults + values.children + values.seniors > 0, {
    message: 'At least one guest is required.',
    path: ['adults'],
  });

type RestaurantReservationFormProps = {
  dictionary: {
    form: {
      title: string;
      name: string;
      namePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      phone: string;
      date: string;
      datePlaceholder: string;
      time: string;
      timePlaceholder: string;
      guests: string;
      guestsPlaceholder: string;
      guestLabel: string;
      guestsLabel: string;
      submit: string;
      submitting: string;
      success: { title: string; description: string };
      error: { title: string; description: string };
    };
  };
  preselectedMenuId?: string;
  providedMenus?: RestaurantMenuOption[];
  initialDraft?: Partial<RestaurantQuickDraft>;
  initialStep?: 1 | 2;
};

export default function RestaurantReservationForm({
  dictionary,
  preselectedMenuId,
  providedMenus,
  initialDraft,
  initialStep = 1,
}: RestaurantReservationFormProps) {
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [menus, setMenus] = useState<RestaurantMenuOption[]>(providedMenus || []);
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<RestaurantAvailabilityPayload | null>(null);

  const initialDate = parseInputDate(initialDraft?.date);
  const initialMenuId = initialDraft?.menuId || preselectedMenuId || '';

  const form = useForm<z.infer<typeof reservationSchema>>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      date: initialDate,
      time: initialDraft?.time || '',
      menuId: initialMenuId,
      adults: typeof initialDraft?.adults === 'number' ? initialDraft.adults : 2,
      children: typeof initialDraft?.children === 'number' ? initialDraft.children : 0,
      seniors: typeof initialDraft?.seniors === 'number' ? initialDraft.seniors : 0,
    },
  });

  const watched = form.watch();
  const totalGuests = (watched.adults || 0) + (watched.children || 0) + (watched.seniors || 0);

  const selectedMenu = useMemo(() => menus.find((menu) => menu.id === watched.menuId), [menus, watched.menuId]);

  const estimatedTotal = useMemo(() => {
    if (!selectedMenu) return 0;
    return (
      (watched.adults || 0) * Number(selectedMenu.price_adult || 0) +
      (watched.children || 0) * Number(selectedMenu.price_child || 0) +
      (watched.seniors || 0) * Number(selectedMenu.price_senior ?? selectedMenu.price_adult ?? 0)
    );
  }, [selectedMenu, watched.adults, watched.children, watched.seniors]);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (!providedMenus || providedMenus.length === 0) return;
    setMenus(
      providedMenus.map((menu) => ({
        ...menu,
        price_senior: menu.price_senior || menu.price_adult || 0,
      })),
    );
  }, [providedMenus]);

  useEffect(() => {
    if (providedMenus && providedMenus.length > 0) return;
    if (!supabase) return;

    const fetchMenus = async () => {
      const { data } = await supabase
        .from('restaurant_menus')
        .select('id, name, price_adult, price_child, price_senior, is_active')
        .eq('is_active', true)
        .order('sort_order');

      if (data) {
        setMenus(
          (data as RestaurantMenuOption[]).map((menu) => ({
            ...menu,
            price_senior: menu.price_senior || menu.price_adult || 0,
          })),
        );
      }
    };

    fetchMenus();
  }, [providedMenus, supabase]);

  useEffect(() => {
    if (!initialMenuId) return;
    const exists = menus.some((menu) => menu.id === initialMenuId);
    if (!exists) return;
    form.setValue('menuId', initialMenuId, { shouldValidate: true });
  }, [initialMenuId, menus, form]);

  useEffect(() => {
    const date = watched.date;
    const time = watched.time;

    if (!date || !time || totalGuests <= 0) {
      setAvailability(null);
      return;
    }

    let aborted = false;
    const run = async () => {
      setIsCheckingAvailability(true);
      try {
        const res = await fetch('/api/public/restaurant/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(date, 'yyyy-MM-dd'),
            time,
            partySize: totalGuests,
          }),
        });
        const data = (await res.json()) as RestaurantAvailabilityPayload;
        if (!aborted) setAvailability(data);
      } catch {
        if (!aborted) setAvailability(null);
      } finally {
        if (!aborted) setIsCheckingAvailability(false);
      }
    };

    run();
    return () => {
      aborted = true;
    };
  }, [watched.date, watched.time, totalGuests]);

  const proceedToStepTwo = async () => {
    const valid = await form.trigger(['menuId', 'date', 'time', 'adults', 'children', 'seniors']);
    if (!valid) return;

    if (!availability?.available) {
      toast({
        variant: 'destructive',
        title: 'Selected slot unavailable',
        description: availability ? getAvailabilityReasonText(availability.reason) : 'Please check availability first.',
      });
      return;
    }

    setStep(2);
  };

  async function onSubmit(values: z.infer<typeof reservationSchema>) {
    if (!availability?.available) {
      toast({
        variant: 'destructive',
        title: 'Selected slot unavailable',
        description: availability ? getAvailabilityReasonText(availability.reason) : 'Please check availability first.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: format(values.date, 'yyyy-MM-dd'),
        time: values.time,
        menuId: values.menuId,
        clientDetails: {
          name: values.clientName,
          email: values.clientEmail,
          phone: values.clientPhone || '',
        },
        ageBreakdown: {
          adults: values.adults,
          children: values.children,
          seniors: values.seniors,
        },
      };

      const res = await fetch('/api/restaurant/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start checkout.');
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Checkout failed',
        description: 'No payment URL was returned.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: dictionary.form.error.title || 'Reservation failed',
        description: error?.message || dictionary.form.error.description || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
              step === 1 ? 'bg-[#79ab64] text-white' : 'bg-[#eef6ea] text-[#5f9150]',
            )}
          >
            1. Reservation setup
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]',
              step === 2 ? 'bg-[#79ab64] text-white' : 'bg-[#eef6ea] text-[#5f9150]',
            )}
          >
            2. Contact and confirm
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">Menu</Label>
              <Select value={watched.menuId} onValueChange={(value) => form.setValue('menuId', value, { shouldValidate: true })}>
                <SelectTrigger className="h-11 rounded-xl border-stone-200">
                  <SelectValue placeholder="Select menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name} | EUR {menu.price_adult}/adult
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-red-600">{form.formState.errors.menuId?.message}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">
                      {dictionary.form.date || 'Date'}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className={cn(
                              'h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-left text-sm font-medium',
                              !field.value && 'text-stone-400',
                            )}
                          >
                            <span className="inline-flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-[#79ab64]" />
                              {field.value ? format(field.value, 'MMM dd, yyyy') : dictionary.form.datePlaceholder || 'Pick date'}
                            </span>
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-xl p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || isRestaurantClosedDay(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">
                      {dictionary.form.time || 'Time'}
                    </Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl border-stone-200">
                        <SelectValue placeholder={dictionary.form.timePlaceholder || 'Select time'} />
                      </SelectTrigger>
                      <SelectContent>
                        {RESTAURANT_TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            <span className="inline-flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {time}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">Adults</Label>
                <Input type="number" min={0} className="h-11 rounded-xl border-stone-200" {...form.register('adults', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">Children</Label>
                <Input type="number" min={0} className="h-11 rounded-xl border-stone-200" {...form.register('children', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">Seniors</Label>
                <Input type="number" min={0} className="h-11 rounded-xl border-stone-200" {...form.register('seniors', { valueAsNumber: true })} />
              </div>
            </div>
            {form.formState.errors.adults?.message && (
              <p className="text-xs text-red-600">{form.formState.errors.adults.message}</p>
            )}

            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Party size</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#18230F]">
                  <Users className="h-4 w-4 text-[#79ab64]" />
                  {totalGuests} guests
                </span>
              </div>
              {totalGuests > 6 && (
                <p className="mt-2 text-[12px] font-medium text-emerald-700">
                  Group reservations are supported with priority confirmation.
                </p>
              )}
            </div>

            {(availability || isCheckingAvailability) && (
              <div
                className={cn(
                  'rounded-xl px-4 py-3 text-sm',
                  availability?.available ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800',
                )}
              >
                {isCheckingAvailability ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking availability...
                  </span>
                ) : (
                  <p className="font-semibold">{getAvailabilityReasonText(availability?.reason || '')}</p>
                )}
              </div>
            )}

            <Button
              type="button"
              className="h-12 w-full rounded-xl border-none bg-[#79ab64] text-white hover:bg-[#6d9b58]"
              onClick={proceedToStepTwo}
              disabled={isCheckingAvailability}
            >
              Continue to contact
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {!availability?.available && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {availability
                  ? getAvailabilityReasonText(availability.reason)
                  : 'Checking selected slot. If unavailable, go back and adjust details.'}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">
                  {dictionary.form.name || 'Name'}
                </Label>
                <Input
                  id="clientName"
                  placeholder={dictionary.form.namePlaceholder || 'Your full name'}
                  className="h-11 rounded-xl border-stone-200"
                  {...form.register('clientName')}
                />
                {form.formState.errors.clientName?.message && (
                  <p className="text-xs text-red-600">{form.formState.errors.clientName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail" className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">
                  {dictionary.form.email || 'Email'}
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder={dictionary.form.emailPlaceholder || 'name@email.com'}
                  className="h-11 rounded-xl border-stone-200"
                  {...form.register('clientEmail')}
                />
                {form.formState.errors.clientEmail?.message && (
                  <p className="text-xs text-red-600">{form.formState.errors.clientEmail.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientPhone" className="text-xs font-bold uppercase tracking-wider text-[#18230F]/60">
                {dictionary.form.phone || 'Phone'}
              </Label>
              <Input id="clientPhone" placeholder="+351..." className="h-11 rounded-xl border-stone-200" {...form.register('clientPhone')} />
            </div>

            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Reservation summary</p>
              <div className="mt-2 grid gap-1 text-sm text-[#18230F]">
                <p>
                  <span className="text-stone-500">Menu:</span> {selectedMenu?.name || '-'}
                </p>
                <p>
                  <span className="text-stone-500">Date:</span> {watched.date ? format(watched.date, 'MMM dd, yyyy') : '-'}
                </p>
                <p>
                  <span className="text-stone-500">Time:</span> {watched.time || '-'}
                </p>
                <p>
                  <span className="text-stone-500">Guests:</span> {totalGuests}
                </p>
              </div>
              <div className="mt-3 border-t border-stone-200 pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Estimated total</span>
                  <span className="font-semibold text-[#18230F]">EUR {estimatedTotal.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-stone-500">Deposit to confirm (30%)</span>
                  <span className="font-semibold text-[#18230F]">EUR {(estimatedTotal * 0.3).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="h-11 rounded-xl border-stone-300" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to details
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl border-none bg-[#79ab64] text-white hover:bg-[#6d9b58]"
                disabled={isSubmitting || isCheckingAvailability || !availability?.available}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {dictionary.form.submitting || 'Submitting...'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {dictionary.form.submit || 'Continue to payment'}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
