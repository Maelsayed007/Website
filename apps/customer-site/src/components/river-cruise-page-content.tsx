'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Mail, MessageCircle, PartyPopper, PhoneCall, UtensilsCrossed, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/providers/supabase-provider';
import { getRiverCruiseEligibility, RIVER_CRUISE_MIN_PAYABLE_GUESTS } from '@/lib/booking-rules';
import { RiverCruiseLoadingSkeleton } from '@/components/loading/public-page-skeletons';

type RiverCruisePackage = {
  id: string;
  name: string;
  description?: string;
  photo_url?: string;
  boat_photo_url?: string;
  duration_hours: number;
  destination: string;
  min_capacity?: number;
  max_capacity?: number;
  maximum_capacity?: number;
  pricing?: {
    type: 'per-person' | 'exclusive';
    totalPrice?: number;
    adults?: { withoutFood?: number };
    children?: { withoutFood?: number };
    seniors?: { withoutFood?: number };
  };
};

type Props = {
  dictionary: any;
  serverData?: {
    packages: RiverCruisePackage[];
    menus: any[];
  };
  locale: string;
};

const schema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  dateTime: z.date({ required_error: 'Date is required.' }),
  adults: z.coerce.number().min(0),
  children: z.coerce.number().min(0),
  seniors: z.coerce.number().min(0),
});

const faqItems = [
  {
    question: 'Can we customize the cruise for events?',
    answer: 'Yes. Birthdays, weddings, anniversaries, and private parties can be tailored with our team.',
  },
  {
    question: 'Can we combine cruise and restaurant?',
    answer: 'Yes. We can prepare combined experiences including cruise and dining options.',
  },
  {
    question: 'How do we ask for a custom proposal?',
    answer: 'Use the request form, call us, or email us and we will prepare a tailored plan.',
  },
];

const DEFAULT_RIVER_CRUISE_MAX_CAPACITY = 120;

function RiverCruisePageContentComponent({ dictionary, serverData }: Props) {
  const d = dictionary?.riverCruise || {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [packages, setPackages] = useState<RiverCruisePackage[]>(serverData?.packages || []);
  const [isLoading, setIsLoading] = useState(!serverData);
  const [selectedPackage, setSelectedPackage] = useState<RiverCruisePackage | null>(null);
  const [open, setOpen] = useState(false);

  const defaultGuests = Number.parseInt(searchParams.get('guests') || `${RIVER_CRUISE_MIN_PAYABLE_GUESTS}`, 10);
  const defaultDate = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    return next;
  }, []);

  const normalizedDefaultGuests = Number.isFinite(defaultGuests) ? Math.max(1, defaultGuests) : RIVER_CRUISE_MIN_PAYABLE_GUESTS;
  const formatsScrollRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      dateTime: defaultDate,
      adults: normalizedDefaultGuests,
      children: 0,
      seniors: 0,
    },
  });

  useEffect(() => {
    if (serverData) {
      setIsLoading(false);
      return;
    }

    if (!supabase) return;

    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('daily_travel_packages').select('*');
      setPackages((data || []) as RiverCruisePackage[]);
      setIsLoading(false);
    };

    load();
  }, [serverData, supabase]);

  useEffect(() => {
    if (packages.length === 0 || selectedPackage) return;
    setSelectedPackage(packages[0]);
  }, [packages, selectedPackage]);

  const watchedAdults = Number(useWatch({ control: form.control, name: 'adults' }) || 0);
  const watchedChildren = Number(useWatch({ control: form.control, name: 'children' }) || 0);
  const watchedSeniors = Number(useWatch({ control: form.control, name: 'seniors' }) || 0);
  const totalGuests = watchedAdults + watchedChildren + watchedSeniors;
  const eligibility = useMemo(
    () => getRiverCruiseEligibility(totalGuests, RIVER_CRUISE_MIN_PAYABLE_GUESTS),
    [totalGuests],
  );

  const scrollFormats = (direction: 'left' | 'right') => {
    const container = formatsScrollRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.85;
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!selectedPackage) return;

    const guestsFromForm = Number(values.adults || 0) + Number(values.children || 0) + Number(values.seniors || 0);
    const submitEligibility = getRiverCruiseEligibility(guestsFromForm, RIVER_CRUISE_MIN_PAYABLE_GUESTS);

    if (!submitEligibility.eligibleForCheckout) {
      if (!values.clientName?.trim() || !values.clientEmail?.trim()) {
        toast({ variant: 'destructive', title: 'Name and email are required for inquiry.' });
        return;
      }

      const inquiryRes = await fetch('/api/river-cruise/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          date: format(values.dateTime, 'yyyy-MM-dd'),
          time: format(values.dateTime, 'HH:mm'),
          adults: values.adults,
          children: values.children,
          seniors: values.seniors,
          clientName: values.clientName,
          clientEmail: values.clientEmail,
          clientPhone: values.clientPhone || '',
        }),
      });

      const inquiryData = await inquiryRes.json();
      if (!inquiryRes.ok) {
        toast({ variant: 'destructive', title: inquiryData.error || 'Inquiry failed.' });
        return;
      }

      toast({ title: 'Inquiry submitted', description: 'We will contact you shortly.' });
      setOpen(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('mode', 'river-cruise');
    params.set('packageId', selectedPackage.id);
    params.set('date', format(values.dateTime, 'yyyy-MM-dd'));
    params.set('time', format(values.dateTime, 'HH:mm'));
    params.set('adults', values.adults.toString());
    params.set('children', values.children.toString());
    params.set('seniors', values.seniors.toString());
    params.set('guests', guestsFromForm.toString());
    if (values.clientName) params.set('clientName', values.clientName);
    if (values.clientEmail) params.set('clientEmail', values.clientEmail);
    if (values.clientPhone) params.set('clientPhone', values.clientPhone);

    router.push(`/checkout?${params.toString()}`);
    setOpen(false);
  };

  const scrollToPlanner = () => {
    document.getElementById('river-cruise-formats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <main className="bg-[#f6f8fc] pb-16">
        <section className="relative bg-[#040c23]">
          <div className="relative min-h-[620px] overflow-hidden md:min-h-[700px]">
            <Image
              src="/river-cruise-hero.jpg"
              alt="River Cruise in Alqueva"
              fill
              sizes="100vw"
              className="hero-breathe object-cover object-center brightness-[0.56] saturate-[0.72] contrast-[0.88]"
              priority
            />
            <div className="absolute inset-0 bg-[#050d28]/62" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050d28]/95 via-[#0a1c4b]/72 to-[#0b1f5a]/30" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050d28]/62 to-transparent" />

            <div className="relative z-[20] mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-4 pb-10 pt-28 text-white md:min-h-[700px] md:px-6 md:pt-32">
              <div className="max-w-3xl">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#c7d7ff]">Alqueva river cruise</p>
                <h1 className="font-display mt-2 text-[clamp(3.15rem,6.9vw,6.45rem)] font-bold leading-[0.9] tracking-[-0.025em] text-white">
                  {d.title || 'River Cruise'}
                </h1>
                <p className="mt-4 max-w-2xl text-[1.06rem] leading-8 text-[#e9f0ff]">
                  Private group cruises with clear planning, flexible event setups, and direct support from first contact to final confirmation.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#23479f]/78 px-3.5 py-1.5 text-[0.82rem] font-semibold text-[#edf4ff]">
                    <Users className="h-3.5 w-3.5" />
                    Up to 120 guests
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#23479f]/78 px-3.5 py-1.5 text-[0.82rem] font-semibold text-[#edf4ff]">
                    <PartyPopper className="h-3.5 w-3.5" />
                    Custom events
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#23479f]/78 px-3.5 py-1.5 text-[0.82rem] font-semibold text-[#edf4ff]">
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    Cruise + dining options
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={scrollToPlanner} className="cta-shimmer h-11 rounded-xl px-5 text-sm font-semibold text-white">
                    Start planning
                  </Button>
                  <Button asChild className="h-11 rounded-xl border-none bg-white px-5 text-sm font-semibold text-[#244db8] hover:bg-white">
                    <Link href="/contact?requestType=event">Request custom event</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="river-cruise-formats" className="mx-auto mt-8 max-w-7xl px-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f5ecf]">Cruise formats</p>
              <h2 className="font-display mt-1 text-4xl font-bold tracking-tight text-[#0e1738] md:text-5xl">
                Choose the experience style
              </h2>
              <p className="mt-2 text-sm text-slate-600">Select a format first. Final total is calculated in the next step based on date and guests.</p>
            </div>
            <Button asChild variant="outline" className="h-10 rounded-xl border-[#c5d5fb] bg-white px-4 text-sm font-semibold text-[#244db8] hover:bg-[#f1f6ff]">
              <Link href="/contact?requestType=river_cruise_inquiry">Need help choosing?</Link>
            </Button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            For groups under 20 guests, contact staff. For 20+ guests, continue with online booking.
          </p>

          {isLoading ? (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-[220px] w-[340px] shrink-0 rounded-2xl md:w-[430px]" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#d8e4ff] bg-white p-8 text-center">
              <p className="font-display text-3xl font-bold text-[#0e1738]">{d.noExcursions?.title || 'No excursions available'}</p>
              <p className="mt-2 text-sm text-slate-600">{d.noExcursions?.description || 'Please check back later or contact us for private options.'}</p>
            </div>
          ) : (
            <div className="mt-4">
              <div ref={formatsScrollRef} className="no-scrollbar overflow-x-auto pb-2 scroll-smooth">
                <div className="flex w-max gap-4 pr-1">
                  {packages.map((pkg) => {
                    const minCapacity = Math.max(RIVER_CRUISE_MIN_PAYABLE_GUESTS, pkg.min_capacity || 0);
                    const maxCapacity = Math.max(minCapacity, pkg.max_capacity || pkg.maximum_capacity || DEFAULT_RIVER_CRUISE_MAX_CAPACITY);
                    const isExclusivePricing = pkg.pricing?.type === 'exclusive';
                    const hoursLabel = `${pkg.duration_hours} hour${pkg.duration_hours === 1 ? '' : 's'}`;
                    return (
                      <article key={pkg.id} className="flex min-h-[220px] w-[340px] flex-col rounded-2xl border border-[#d8e4ff] bg-white p-4 md:w-[430px] md:p-5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <h3 className="font-display truncate text-[2rem] font-bold leading-none tracking-tight text-[#0e1738]">{pkg.name}</h3>
                          <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3557a8] whitespace-nowrap">
                            {isExclusivePricing ? 'Exclusive' : 'Per guest'}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-slate-500">{pkg.destination || 'Alqueva Lake'}</p>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-[#f3f7ff] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Duration</p>
                            <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-[#0e1738]">{hoursLabel}</p>
                          </div>
                          <div className="rounded-lg bg-[#f3f7ff] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Min</p>
                            <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-[#0e1738]">{minCapacity} guests</p>
                          </div>
                          <div className="rounded-lg bg-[#f3f7ff] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Max</p>
                            <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-[#0e1738]">{maxCapacity} guests</p>
                          </div>
                        </div>

                        <div className="mt-auto pt-4">
                          <Button
                            className="cta-shimmer h-10 w-full rounded-xl text-sm font-semibold text-white"
                            onClick={() => {
                              setSelectedPackage(pkg);
                              form.setValue('dateTime', defaultDate);
                              form.setValue('adults', normalizedDefaultGuests);
                              form.setValue('children', 0);
                              form.setValue('seniors', 0);
                              setOpen(true);
                            }}
                          >
                            Continue to details
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => scrollFormats('left')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100"
                  aria-label="Scroll formats left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollFormats('right')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100"
                  aria-label="Scroll formats right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto mt-8 max-w-7xl px-4 md:px-6">
          <div className="rounded-2xl border border-[#d8e4ff] bg-white p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f5ecf]">Custom events</p>
            <h2 className="font-display mt-2 text-4xl font-bold tracking-tight text-[#0e1738] md:text-5xl">
              Design your celebration on the lake
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Birthdays, weddings, anniversaries, private parties, and corporate moments can be fully customized by our team, including cruise, dining, and onboard sound setup.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Birthdays', 'Weddings', 'Anniversaries', 'Private parties', 'Cruise + dining', 'Sound system setup'].map((item) => (
                <span key={item} className="rounded-full border border-[#d4def6] bg-[#f2f7ff] px-3 py-1 text-xs font-semibold text-[#3557a8]">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild className="cta-shimmer h-10 rounded-xl px-5 text-sm font-semibold text-white">
                <Link href="/contact?requestType=event">Request custom proposal</Link>
              </Button>
              <a href="tel:+351934343567" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c5d5fb] bg-white px-4 text-sm font-semibold text-[#244db8]">
                <PhoneCall className="h-4 w-4" />
                Call
              </a>
              <a href="mailto:geral@amieiramarina.com" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c5d5fb] bg-white px-4 text-sm font-semibold text-[#244db8]">
                <Mail className="h-4 w-4" />
                Email
              </a>
            </div>
          </div>
        </section>


        <section className="mx-auto mt-8 max-w-7xl px-4 md:px-6">
          <div className="rounded-2xl border border-[#d8e4ff] bg-white p-5 md:p-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0e1738] md:text-4xl">Frequently asked questions</h2>
            <div className="mt-4 space-y-2">
              {faqItems.map((item) => (
                <details key={item.question} className="rounded-xl border border-[#dbe3f2] bg-[#f9fbff] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#0e1738]">{item.question}</summary>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button onClick={scrollToPlanner} className="cta-shimmer h-10 rounded-xl px-5 text-sm font-semibold text-white">
                Plan your cruise
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl border-[#c5d5fb] bg-white px-5 text-sm font-semibold text-[#244db8] hover:bg-[#f1f6ff]">
                <Link href="/contact?requestType=river_cruise_inquiry">
                  <MessageCircle className="mr-1 h-4 w-4" />
                  Contact us
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none p-0">
          <div className="p-6 md:p-8">
            <div className="mb-2 flex items-center justify-between">
              <DialogTitle className="text-2xl text-[#0e1738]">{d.dialog?.title || 'Request booking'}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close dialog</span>
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="mb-4 text-slate-600">
              {d.dialog?.description || 'Share your preferred date and group details. We will confirm availability quickly.'}
            </DialogDescription>
            {selectedPackage && (
              <p className="mb-3 text-sm font-semibold text-[#244db8]">Selected format: {selectedPackage.name}</p>
            )}

            {!eligibility.eligibleForCheckout && (
              <div className="mb-4 rounded-2xl border border-[#c7d8ff] bg-[#f4f8ff] p-4 text-xs text-slate-700">
                <p className="font-semibold text-[#0e1738]">Need support planning this group?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href="tel:+351934343567" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#abc2ff] bg-white px-3">
                    <PhoneCall className="h-3.5 w-3.5 text-[#1f4dc8]" />
                    Call
                  </a>
                  <a href="mailto:geral@amieiramarina.com" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#abc2ff] bg-white px-3">
                    <Mail className="h-3.5 w-3.5 text-[#1f4dc8]" />
                    Email
                  </a>
                  <Link href="/contact?requestType=river_cruise_inquiry" className="inline-flex h-8 items-center rounded-full border border-[#abc2ff] bg-white px-3">
                    Inquiry form
                  </Link>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} type="email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button type="button" variant="outline" className="w-full justify-between">
                              {field.value ? format(field.value, 'PPP') : 'Pick date'}
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="adults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? 0}
                            onChange={(event) => {
                              const parsed = Number.parseInt(event.target.value || '0', 10);
                              field.onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="children"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Children</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? 0}
                            onChange={(event) => {
                              const parsed = Number.parseInt(event.target.value || '0', 10);
                              field.onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seniors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seniors</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? 0}
                            onChange={(event) => {
                              const parsed = Number.parseInt(event.target.value || '0', 10);
                              field.onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <p className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <Users className="h-3.5 w-3.5" />
                  Total guests: {totalGuests}
                </p>
                <Button type="submit" className="cta-shimmer h-11 w-full rounded-xl border-none text-white">
                  {eligibility.eligibleForCheckout ? 'Continue to checkout' : 'Send inquiry'}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function RiverCruisePageContentWrapper(props: Props) {
  return (
    <Suspense fallback={<RiverCruiseLoadingSkeleton />}>
      <RiverCruisePageContentComponent {...props} />
    </Suspense>
  );
}
