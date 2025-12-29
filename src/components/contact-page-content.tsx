'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Mail, Send } from "lucide-react"
import { useDoc, useFirestore } from '@/firebase';
import { doc, addDoc, collection, getDocs, query, where, setDoc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { sendBookingRequestEmail } from '@/lib/email';

type SocialLinks = {
  tiktok?: string;
  facebook?: string;
  instagram?: string;
};

type WebsiteSettings = {
  companyName: string;
  logoUrl: string;
  contactEmail: string;
  restaurantEmail: string;
  contactPhone1: string;
  contactPhone2: string;
  workingHours: string;
  socialLinks: SocialLinks;
  address: string;
};

type ContactPageContentProps = {
  dictionary: {
    title: string;
    subtitle: string;
    form: {
      title: string;
      name: string;
      namePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      message: string;
      messagePlaceholder: string;
      submit: string;
      submitting: string;
      success: { title: string; description: string; };
      error: { title: string; description: string; };
      validation: { title: string; description: string; };
    };
    info: { title: string; };
    location: { title: string; };
  };
};

export default function ContactPageContent({ dictionary }: ContactPageContentProps) {
  const d = dictionary;
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', message: '', phone: '' });

  const settingsDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'website_settings', 'main');
  }, [firestore]);

  const { data: websiteSettings, isLoading } = useDoc<WebsiteSettings>(settingsDocRef);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  }

  const findOrCreateClient = async (name: string, email: string, phone: string) => {
    if (!firestore) return;
    const clientsRef = collection(firestore, 'clients');
    const q = query(clientsRef, where('email', '==', email.toLowerCase()));
    
    const querySnapshot = await getDocs(q);
    const now = new Date().toISOString();
    
    if (querySnapshot.empty) {
      // Create new client as a "Lead"
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
      // Update existing client's last contact and potentially add phone number
      const clientDocRef = querySnapshot.docs[0].ref;
      await setDoc(clientDocRef, { lastContact: now, phone }, { merge: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !formState.name || !formState.email || !formState.message) {
      toast({
        variant: 'destructive',
        title: d.form.validation.title,
        description: d.form.validation.description,
      });
      return;
    }
    setIsSubmitting(true);
    try {
        const newBooking = {
            clientName: formState.name,
            clientEmail: formState.email,
            clientPhone: formState.phone,
            notes: `Contact Form Message: ${formState.message}`,
            status: 'Pending' as const,
            source: 'Website Contact Form',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
        };

      await addDoc(collection(firestore, 'bookings'), newBooking);
      
      await findOrCreateClient(formState.name, formState.email, formState.phone);
      
      // "Send" email confirmation
      await sendBookingRequestEmail(newBooking);

      toast({
        title: d.form.success.title,
        description: d.form.success.description,
      });
      setFormState({ name: '', email: '', message: '', phone: '' });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: d.form.error.title,
        description: d.form.error.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
          {d.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {d.subtitle}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{d.form.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{d.form.name}</Label>
                  <Input id="name" placeholder={d.form.namePlaceholder} value={formState.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{d.form.email}</Label>
                  <Input id="email" type="email" placeholder={d.form.emailPlaceholder} value={formState.email} onChange={handleInputChange} required />
                </div>
                 <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="Your phone number" value={formState.phone} onChange={handleInputChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{d.form.message}</Label>
                <Textarea id="message" placeholder={d.form.messagePlaceholder} className="min-h-[120px]" value={formState.message} onChange={handleInputChange} required />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting ? d.form.submitting : <>{d.form.submit} <Send className="ml-2 h-4 w-4"/></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <div>
            <h3 className="font-headline text-2xl font-semibold">{d.info.title}</h3>
            <div className="mt-4 space-y-4 text-muted-foreground">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>{websiteSettings?.address || 'Amieira Marina, 7220-123 Amieira, Portugal'}</span>
                  </div>
                  {websiteSettings?.contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <a href={`mailto:${websiteSettings.contactEmail}`} className="hover:text-primary">{websiteSettings.contactEmail}</a>
                    </div>
                  )}
                  {websiteSettings?.restaurantEmail && (
                     <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <a href={`mailto:${websiteSettings.restaurantEmail}`} className="hover:text-primary">{websiteSettings.restaurantEmail} (Restaurant)</a>
                    </div>
                  )}
                  {websiteSettings?.contactPhone1 && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span>{websiteSettings.contactPhone1}</span>
                    </div>
                  )}
                  {websiteSettings?.contactPhone2 && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span>{websiteSettings.contactPhone2}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-headline text-2xl font-semibold">{d.location.title}</h3>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-muted flex items-center justify-center border">
               <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3133.093313942095!2d-7.531238684668597!3d38.25436697967527!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd108f0227184851%3A0x1d46e33f3844890c!2sAmieira%20Marina!5e0!3m2!1sen!2spt!4v1689257697416!5m2!1sen!2spt" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true}
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
