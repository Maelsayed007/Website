'use client';

import { useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, Euro, User, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
  photoUrl: string;
  durationHours: number;
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

const findOrCreateClient = async (firestore: any, name: string, email: string, phone: string) => {
    if (!firestore) return;
    const clientsRef = collection(firestore, 'clients');
    const q = query(clientsRef, where('email', '==', email.toLowerCase()));
    
    const querySnapshot = await getDocs(q);
    const now = new Date().toISOString();
    
    if (querySnapshot.empty) {
      // Create new client as a "Lead" since it's just a request
      const clientDocRef = doc(clientsRef);
      await setDoc(clientDocRef, {
        name,
        email: email.toLowerCase(),
        phone,
        status: 'Lead',
        lastContact: now,
        createdAt: now,
        contactHistory: [],
      });
    } else {
      // Update existing client's last contact
      const clientDocRef = querySnapshot.docs[0].ref;
      await setDoc(clientDocRef, { 
        lastContact: now, 
        phone,
      }, { merge: true });
    }
  };

function PackageCard({ pkg, onBook, dictionary }: { pkg: DailyTravelPackage, onBook: (pkg: DailyTravelPackage) => void, dictionary: DailyTravelPageContentProps['dictionary']['dailyTravel'] }) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-gray-100 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <div className="relative aspect-video w-full">
        <Image
          src={pkg.photoUrl || 'https://placehold.co/600x400/E2E8F0/A0AEC0?text=No+Image'}
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
          <span>{dictionary.duration}: {pkg.durationHours} {dictionary.hours}</span>
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
  const firestore = useFirestore();
  const router = useRouter();

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<DailyTravelPackage | null>(null);

  const packagesQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'daily_travel_packages');
  }, [firestore]);

  const { data: packages, isLoading } = useCollection<DailyTravelPackage>(packagesQuery);
  
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
    if (!firestore || !selectedPackage) return;
    
    try {
      const newBooking = {
        dailyTravelPackageId: selectedPackage.id,
        clientName: values.clientName,
        clientEmail: values.clientEmail,
        clientPhone: values.clientPhone,
        startTime: new Date().toISOString(), // Placeholder, to be confirmed
        endTime: new Date().toISOString(), // Placeholder
        status: 'Pending' as const,
        notes: `Daily travel request for ${values.guests} guest(s).`,
        source: 'Website - Daily Travel',
      };
      await addDoc(collection(firestore, 'bookings'), newBooking);
      
      await findOrCreateClient(firestore, values.clientName, values.clientEmail, values.clientPhone);
      
      await sendBookingRequestEmail(newBooking);

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
                  <FormItem><FormLabel className="flex items-center gap-2"><User size={16}/> {d.dialog.form.name}</FormLabel><FormControl><Input placeholder={d.dialog.form.namePlaceholder} {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="clientEmail" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-2"><Mail size={16}/> {d.dialog.form.email}</FormLabel><FormControl><Input type="email" placeholder={d.dialog.form.emailPlaceholder} {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="clientPhone" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-2"><Phone size={16}/> {d.dialog.form.phone}</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="guests" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-2"><Users size={16}/> {d.dialog.form.guests}</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )}/>
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
