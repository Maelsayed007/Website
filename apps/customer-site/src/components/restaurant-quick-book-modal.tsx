'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getAvailabilityReasonText,
  normalizeQuickDraft,
  RESTAURANT_TIME_OPTIONS,
  RestaurantAvailabilityPayload,
  RestaurantMenuOption,
  RestaurantQuickDraft,
} from './restaurant-booking.types';

const quickBookSchema = z
  .object({
    menuId: z.string().min(1, 'Please select a menu.'),
    date: z.string().min(1, 'Please select a date.'),
    time: z.string().min(1, 'Please select a time.'),
    adults: z.coerce.number().int().min(0),
    children: z.coerce.number().int().min(0),
    seniors: z.coerce.number().int().min(0),
  })
  .refine((values) => values.adults + values.children + values.seniors > 0, {
    message: 'At least one guest is required.',
    path: ['adults'],
  });

type QuickBookFormValues = z.infer<typeof quickBookSchema>;

type RestaurantQuickBookModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menus: RestaurantMenuOption[];
  initialDraft: Partial<RestaurantQuickDraft>;
  onDraftChange?: (draft: RestaurantQuickDraft) => void;
};

export default function RestaurantQuickBookModal({
  open,
  onOpenChange,
  menus,
  initialDraft,
  onDraftChange,
}: RestaurantQuickBookModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<RestaurantAvailabilityPayload | null>(null);

  const fallbackMenuId = menus[0]?.id || '';
  const normalizedDraft = useMemo(
    () => normalizeQuickDraft(initialDraft, fallbackMenuId),
    [fallbackMenuId, initialDraft],
  );

  const form = useForm<QuickBookFormValues>({
    resolver: zodResolver(quickBookSchema),
    defaultValues: normalizedDraft,
  });

  const watched = form.watch();
  const totalGuests = (watched.adults || 0) + (watched.children || 0) + (watched.seniors || 0);

  useEffect(() => {
    if (!open) return;
    form.reset(normalizedDraft);
    setAvailability(null);
  }, [form, normalizedDraft, open]);

  useEffect(() => {
    setAvailability(null);
  }, [watched.menuId, watched.date, watched.time, watched.adults, watched.children, watched.seniors]);

  const checkAvailability = async () => {
    const valid = await form.trigger(['menuId', 'date', 'time', 'adults', 'children', 'seniors']);
    if (!valid) return false;

    const values = form.getValues();
    setIsCheckingAvailability(true);
    try {
      const partySize = values.adults + values.children + values.seniors;
      const res = await fetch('/api/public/restaurant/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: values.date,
          time: values.time,
          partySize,
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
      }
      return payload.available;
    } catch {
      toast({
        variant: 'destructive',
        title: 'Availability check failed',
        description: 'Please try again.',
      });
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleContinue = async () => {
    const values = form.getValues();
    const isAvailable = availability?.available ? true : await checkAvailability();
    if (!isAvailable) return;

    const draft = normalizeQuickDraft(values, fallbackMenuId);
    onDraftChange?.(draft);

    const params = new URLSearchParams();
    params.set('menuId', draft.menuId);
    params.set('date', draft.date);
    params.set('time', draft.time);
    params.set('adults', String(draft.adults));
    params.set('children', String(draft.children));
    params.set('seniors', String(draft.seniors));

    onOpenChange(false);
    router.push(`/restaurant/reserve?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto rounded-2xl border border-[#d7e2ff] bg-white p-0 shadow-none">
        <DialogHeader className="border-b border-[#e4ecff] px-6 pb-4 pt-6 text-left">
          <DialogTitle className="font-display text-[2rem] font-bold tracking-tight text-[#0e1738]">
            Find your table
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-6 text-slate-600">
            Select menu, date, time, and guest details. We will verify availability before you continue.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-5">
          <Form {...form}>
            <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Menu</Label>
                <FormField
                  control={form.control}
                  name="menuId"
                  render={({ field }) => (
                    <FormItem>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-[#cfdbf7] bg-white">
                            <SelectValue placeholder="Select a menu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {menus.map((menu) => (
                            <SelectItem key={menu.id} value={menu.id}>
                              {menu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Date</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    className="h-11 rounded-xl border-[#cfdbf7] bg-white"
                    {...form.register('date')}
                  />
                  {form.formState.errors.date?.message && (
                    <p className="text-xs text-red-600">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Time</Label>
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-[#cfdbf7] bg-white">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RESTAURANT_TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Party size</Label>
                  <div className="flex h-11 items-center justify-between rounded-xl border border-[#cfdbf7] bg-white px-3">
                    <span className="text-sm text-slate-500">Total guests</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0e1738]">
                      <Users className="h-4 w-4 text-[#2f5ecf]" />
                      {totalGuests}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Adults</Label>
                  <Input type="number" min={0} className="h-11 rounded-xl border-[#cfdbf7] bg-white" {...form.register('adults', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Children</Label>
                  <Input type="number" min={0} className="h-11 rounded-xl border-[#cfdbf7] bg-white" {...form.register('children', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Seniors</Label>
                  <Input type="number" min={0} className="h-11 rounded-xl border-[#cfdbf7] bg-white" {...form.register('seniors', { valueAsNumber: true })} />
                </div>
              </div>
              {form.formState.errors.adults?.message && (
                <p className="text-xs text-red-600">{form.formState.errors.adults.message}</p>
              )}

              {(availability || isCheckingAvailability) && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    availability?.available ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {isCheckingAvailability ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking availability...
                    </span>
                  ) : (
                    getAvailabilityReasonText(availability?.reason || '')
                  )}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-[#cfdbf7] bg-white text-[#244db8]"
                  onClick={checkAvailability}
                  disabled={isCheckingAvailability}
                >
                  {isCheckingAvailability ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    'Check availability'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleContinue}
                  className="cta-shimmer h-11 rounded-xl border-none text-white"
                  disabled={isCheckingAvailability || totalGuests <= 0}
                >
                  Continue reservation
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
