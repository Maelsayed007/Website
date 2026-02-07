'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, Euro, User, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/providers/supabase-provider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { sendBookingRequestEmail } from '@/lib/email';

type DailyTravelPageContentProps = {
  dictionary: {
    dailyTravel: {
      title: string;
      subtitle: string;
      duration: string;
      hours: string;
      minimum: string;
      people: string;
      from: string;
      exclusive: string;
      perAdult: string;
      requestBooking: string;
      noExcursions: { title: string; description: string; };
      submissionFailed: { title: string; description: string; };
      dialog: {
        title: string;
        description: string;
        form: {
          name: string; namePlaceholder: string;
          email: string; emailPlaceholder: string;
          phone: string;
          guests: string;
          cancel: string; submit: string; submitting: string;
        };
      };
    };
  };
};

// --- Types ---
type AgePrice = { price: number; minAge: number; maxAge?: number };
type Pricing = {
  type: 'per-person' | 'exclusive';
  adults: AgePrice;
  children: AgePrice;
  seniors: Omit<AgePrice, 'maxAge'>;
  totalPrice?: number;
};
type Terms = { minimumPeople: number; conditions: string };
type DailyTravelPackage = {
  id: string;
  name: string;
  boatId: string;
  photo_url: string;
  duration_hours: number;
  destination: string;
  pricing: Pricing;
  terms: Terms;
};

const bookingSchema = z.object({
  clientName: z.string().min(2, { message: 'Name is required.' }),
  clientEmail: z.string().email({ message: 'A valid email is required.' }),
  clientPhone: z.string().min(5, { message: 'Phone number is required.' }),
  guests: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive({ message: 'Please enter a valid number of guests.' })
  ),
});

const findOrCreateClient = async (supabase: any, name: string, email: string, phone: string) => {
  if (!supabase) return;

  const { data: existingClients, error: queryError } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1);

  if (queryError) throw queryError;

  const now = new Date().toISOString();

  if (!existingClients || existingClients.length === 0) {
    // Create new client as a "Lead" since it's just a request
    await supabase.from('clients').insert({
      name,
      email: email.toLowerCase(),
      phone,
      status: 'Lead',
      last_contact: now,
      created_at: now,
      contact_history: [],
    });
  } else {
    // Update existing client's last contact
    const client = existingClients[0];
    await supabase
      .from('clients')
      .update({
        last_contact: now,
        phone,
      })
      .eq('id', client.id);
  }
};

function PackageCard({ pkg, onBook, dictionary }: { pkg: DailyTravelPackage, onBook: (pkg: DailyTravelPackage) => void, dictionary: DailyTravelPageContentProps['dictionary']['dailyTravel'] }) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-gray-100 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <div className="relative aspect-video w-full">
        <Image
          src={pkg.photo_url || 'https://placehold.co/600x400/E2E8F0/A0AEC0?text=No+Image'}
          alt={pkg.name}
          fill
          className="object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl" style={{ color: '#010a1f' }}>{pkg.name}</CardTitle>
        <CardDescription>{pkg.destination}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          <span>{dictionary.duration}: {pkg.duration_hours} {dictionary.hours}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" />
          <span>{dictionary.minimum}: {pkg.terms.minimumPeople} {dictionary.people}</span>
        </div>
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-green-600" />
          <span className="font-semibold" style={{ color: '#010a1f' }}>
            {pkg.pricing.type === 'exclusive'
              ? `${dictionary.from} €${pkg.pricing.totalPrice} (${dictionary.exclusive})`
              : `${dictionary.from} €${pkg.pricing.adults.price} ${dictionary.perAdult}`
            }
          </span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto p-4">
        <Button onClick={() => onBook(pkg)} className="w-full rounded-full h-11 font-semibold">
          {dictionary.requestBooking}
        </Button>
      </CardFooter>
    </Card>
  );
}

function DailyTravelPageContentComponent({ dictionary }: DailyTravelPageContentProps) {
  const d = dictionary.dailyTravel;
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<DailyTravelPackage | null>(null);
  const [packages, setPackages] = useState<DailyTravelPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('daily_travel_packages')
          .select('*');

        if (error) throw error;
        setPackages(data || []);
      } catch (err) {
        console.error('Error fetching daily travel packages:', err);
        toast({ variant: 'destructive', title: 'Error fetching packages' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackages();
  }, [supabase, toast]);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
    },
  });

  const handleBookClick = (pkg: DailyTravelPackage) => {
    setSelectedPackage(pkg);
    setIsBookingDialogOpen(true);
    form.reset();
  };

  const handleBookingSubmit = async (values: z.infer<typeof bookingSchema>) => {
    if (!supabase || !selectedPackage) return;

    try {
      const newBooking = {
        daily_travel_package_id: selectedPackage.id,
        client_name: values.clientName,
        client_email: values.clientEmail,
        client_phone: values.clientPhone,
        start_time: new Date().toISOString(), // Placeholder
        end_time: new Date().toISOString(), // Placeholder
        status: 'Pending',
        notes: `Daily travel request for ${values.guests} guest(s).`,
        source: 'Website - Daily Travel',
      };

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(newBooking);

      if (bookingError) throw bookingError;

      await findOrCreateClient(supabase, values.clientName, values.clientEmail, values.clientPhone);

      await sendBookingRequestEmail({
        ...newBooking,
        clientName: newBooking.client_name,
        clientEmail: newBooking.client_email,
        clientPhone: newBooking.client_phone,
        startTime: newBooking.start_time,
        endTime: newBooking.end_time,
      } as any);

      router.push(`/payment-instructions`);

    } catch (error) {
      console.error('Daily travel booking error:', error);
      toast({
        variant: 'destructive',
        title: d.submissionFailed.title,
        description: d.submissionFailed.description,
      });
    }
  };

  return (
    <>
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl" style={{ color: '#010a1f' }}>
            {d.title}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            {d.subtitle}
          </p>
        </div>

        <div className="mt-16">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-2xl" />
              ))}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {packages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} onBook={handleBookClick} dictionary={d} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-muted/50 rounded-2xl border-2 border-dashed">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold" style={{ color: '#010a1f' }}>{d.noExcursions.title}</h2>
              <p className="mt-2 text-muted-foreground">
                {d.noExcursions.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{d.dialog.title}: {selectedPackage?.name}</DialogTitle>
            <DialogDescription>
              {d.dialog.description}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleBookingSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center gap-2"><User size={16} /> {d.dialog.form.name}</FormLabel><FormControl><Input placeholder={d.dialog.form.namePlaceholder} {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientEmail" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center gap-2"><Mail size={16} /> {d.dialog.form.email}</FormLabel><FormControl><Input type="email" placeholder={d.dialog.form.emailPlaceholder} {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientPhone" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center gap-2"><Phone size={16} /> {d.dialog.form.phone}</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="guests" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center gap-2"><Users size={16} /> {d.dialog.form.guests}</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-full">{d.dialog.form.cancel}</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full">
                  {form.formState.isSubmitting ? d.dialog.form.submitting : d.dialog.form.submit}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DailyTravelPageContentWrapper(props: DailyTravelPageContentProps) {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">Loading...</div>}>
      <DailyTravelPageContentComponent {...props} />
    </Suspense>
  )
}
