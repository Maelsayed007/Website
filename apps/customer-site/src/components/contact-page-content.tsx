'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/providers/supabase-provider';
import { sendBookingRequestEmail } from '@/lib/email';

type SocialLinks = {
  tiktok?: string;
  facebook?: string;
  instagram?: string;
};

type WebsiteSettings = {
  company_name: string;
  logoUrl: string;
  email: string;
  restaurant_email?: string;
  phone: string;
  phone_alt?: string;
  working_hours?: string;
  social_links: SocialLinks;
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
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', message: '', phone: '' });
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data: record } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'main')
        .single();

      if (record && record.data) {
        setWebsiteSettings(record.data as any);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  }

  const findOrCreateClient = async (name: string, email: string, phone: string) => {
    if (!supabase) return;

    const { data: existingClients } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1);

    const now = new Date().toISOString();

    if (!existingClients || existingClients.length === 0) {
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
      const client = existingClients[0];
      await supabase
        .from('clients')
        .update({ last_contact: now, phone })
        .eq('id', client.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase || !formState.name || !formState.email || !formState.message) {
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
        client_name: formState.name,
        client_email: formState.email,
        client_phone: formState.phone,
        notes: `Contact Form Message: ${formState.message}`,
        status: 'Pending',
        source: 'Website Contact Form',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
      };

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(newBooking);

      if (bookingError) throw bookingError;

      await findOrCreateClient(formState.name, formState.email, formState.phone);

      await sendBookingRequestEmail({
        ...newBooking,
        clientName: newBooking.client_name,
        clientEmail: newBooking.client_email,
        clientPhone: newBooking.client_phone,
        startTime: newBooking.start_time,
        endTime: newBooking.end_time,
      } as any);

      toast({
        title: d.form.success.title,
        description: d.form.success.description,
      });
      setFormState({ name: '', email: '', message: '', phone: '' });
    } catch (error) {
      console.error("Contact form error:", error);
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
        <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl" style={{ color: '#010a1f' }}>
          {d.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {d.subtitle}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle style={{ color: '#010a1f' }}>{d.form.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" style={{ color: '#010a1f' }}>{d.form.name}</Label>
                  <Input id="name" placeholder={d.form.namePlaceholder} value={formState.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: '#010a1f' }}>{d.form.email}</Label>
                  <Input id="email" type="email" placeholder={d.form.emailPlaceholder} value={formState.email} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone" style={{ color: '#010a1f' }}>Phone</Label>
                  <Input id="phone" placeholder="Your phone number" value={formState.phone} onChange={handleInputChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" style={{ color: '#010a1f' }}>{d.form.message}</Label>
                <Textarea id="message" placeholder={d.form.messagePlaceholder} className="min-h-[120px]" value={formState.message} onChange={handleInputChange} required />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={isSubmitting}>
                {isSubmitting ? d.form.submitting : <>{d.form.submit} <Send className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <div>
            <h3 className="font-headline text-2xl font-semibold" style={{ color: '#010a1f' }}>{d.info.title}</h3>
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
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    <span style={{ color: '#010a1f' }}>{websiteSettings?.address || 'Amieira Marina, 7220-123 Amieira, Portugal'}</span>
                  </div>
                  {websiteSettings?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-emerald-600" />
                      <a href={`mailto:${websiteSettings.email}`} className="hover:text-emerald-600" style={{ color: '#010a1f' }}>{websiteSettings.email}</a>
                    </div>
                  )}
                  {websiteSettings?.restaurant_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-emerald-600" />
                      <a href={`mailto:${websiteSettings.restaurant_email}`} className="hover:text-emerald-600" style={{ color: '#010a1f' }}>{websiteSettings.restaurant_email} (Restaurant)</a>
                    </div>
                  )}
                  {websiteSettings?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-emerald-600" />
                      <span style={{ color: '#010a1f' }}>{websiteSettings.phone}</span>
                    </div>
                  )}
                  {websiteSettings?.phone_alt && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-emerald-600" />
                      <span style={{ color: '#010a1f' }}>{websiteSettings.phone_alt}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-headline text-2xl font-semibold" style={{ color: '#010a1f' }}>{d.location.title}</h3>
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
