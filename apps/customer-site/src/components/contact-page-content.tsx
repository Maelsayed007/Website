'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { MapPin, Phone, Mail, Send, Utensils } from "lucide-react"
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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const directEmail = 'geral@amieiramarina.com';
  const directPhoneA = '+351934343567';
  const directPhoneB = '+351933248039';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: '',
    phone: '',
    requestType: 'general',
  });
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

  useEffect(() => {
    const requestTypeParam = searchParams.get('requestType');
    const allowed = new Set(['general', 'event', 'river_cruise_under_20', 'river_cruise_inquiry', 'restaurant_group']);
    if (requestTypeParam && allowed.has(requestTypeParam)) {
      const normalized = requestTypeParam === 'river_cruise_under_20'
        ? 'river_cruise_inquiry'
        : requestTypeParam;
      setFormState((prev) => ({ ...prev, requestType: normalized }));
    }
  }, [searchParams]);

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
        notes: `Request Type: ${formState.requestType}\nContact Form Message: ${formState.message}`,
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
      setFormState({ name: '', email: '', message: '', phone: '', requestType: 'general' });
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
    <div className="container mx-auto max-w-6xl px-4 pt-32 pb-12 sm:pt-36 sm:pb-16">
      <div className="text-center mb-10">
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl text-[#18230F]">
          {d.title}
        </h1>
        <p className="mt-2 max-w-2xl mx-auto text-base text-[#18230F]/60">
          {d.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          <a href={`mailto:${directEmail}`} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
            {directEmail}
          </a>
          <a href={`tel:${directPhoneA}`} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
            {directPhoneA}
          </a>
          <a href={`tel:${directPhoneB}`} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
            {directPhoneB}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Contact Form (7 cols) */}
        <Card className="lg:col-span-7 shadow-sm border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-[#18230F] font-bold">{d.form.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-[#18230F]/70">{d.form.name}</Label>
                  <Input id="name" className="h-9 border-gray-200 text-[#18230F]" placeholder={d.form.namePlaceholder} value={formState.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#18230F]/70">{d.form.email}</Label>
                  <Input id="email" type="email" className="h-9 border-gray-200 text-[#18230F]" placeholder={d.form.emailPlaceholder} value={formState.email} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone" className="text-xs font-semibold text-[#18230F]/70">Phone</Label>
                  <Input id="phone" className="h-9 border-gray-200 text-[#18230F]" placeholder="Your phone number" value={formState.phone} onChange={handleInputChange} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="requestType" className="text-xs font-semibold text-[#18230F]/70">Request Type</Label>
                  <select
                    id="requestType"
                    className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm text-[#18230F]"
                    value={formState.requestType}
                    onChange={(e) => setFormState(prev => ({ ...prev, requestType: e.target.value }))}
                  >
                    <option value="general">General inquiry</option>
                    <option value="event">Custom event (birthday, wedding, anniversary)</option>
                    <option value="river_cruise_inquiry">River cruise inquiry</option>
                    <option value="restaurant_group">Restaurant group booking</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold text-[#18230F]/70">{d.form.message}</Label>
                <Textarea id="message" placeholder={d.form.messagePlaceholder} className="min-h-[100px] resize-none border-gray-200 text-[#18230F]" value={formState.message} onChange={handleInputChange} required />
              </div>
              <Button type="submit" className="cta-shimmer w-full h-10 font-bold text-white" disabled={isSubmitting}>
                {isSubmitting ? d.form.submitting : <>{d.form.submit} <Send className="ml-2 h-3.5 w-3.5" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info & Map (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#18230F]/[0.02] p-6 rounded-xl border border-[#18230F]/5">
            <h3 className="font-headline text-lg font-bold text-[#18230F] mb-4">{d.info.title}</h3>
            <div className="space-y-3 text-sm text-[#18230F]/70">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-[#2b5fd8] mt-0.5" />
                    <span className="text-[#18230F] leading-tight">{websiteSettings?.address || 'Amieira Marina, 7220-123 Amieira, Portugal'}</span>
                  </div>
                  {websiteSettings?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#2b5fd8]" />
                      <a href={`mailto:${websiteSettings.email}`} className="hover:text-[#2b5fd8] font-medium text-[#18230F]">{websiteSettings.email}</a>
                    </div>
                  )}
                  {websiteSettings?.restaurant_email && (
                    <div className="flex items-center gap-3">
                      <Utensils className="h-4 w-4 text-[#2b5fd8]" />
                      <a href={`mailto:${websiteSettings.restaurant_email}`} className="hover:text-[#2b5fd8] font-medium text-[#18230F]">{websiteSettings.restaurant_email}</a>
                    </div>
                  )}
                  {websiteSettings?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#2b5fd8]" />
                      <span className="font-medium text-[#18230F]">{websiteSettings.phone}</span>
                    </div>
                  )}
                  {websiteSettings?.phone_alt && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#2b5fd8]" />
                      <span className="font-medium text-[#18230F]">{websiteSettings.phone_alt}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 h-48 bg-muted">
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
  )
}
