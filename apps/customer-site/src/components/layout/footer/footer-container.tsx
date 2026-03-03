'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Music, Twitter, Mail, PhoneCall, MapPin } from 'lucide-react';
import Logo from '@/components/logo';
import { useSupabase } from '@/components/providers/supabase-provider';
import type { FooterDictionary, FooterWebsiteSettings } from './types';

type FooterProps = {
  dictionary?: FooterDictionary;
};

export default function Footer({ dictionary }: FooterProps) {
  const { supabase } = useSupabase();
  const [websiteSettings, setWebsiteSettings] = useState<FooterWebsiteSettings | null>(null);
  const companyName = websiteSettings?.company_name || 'Amieira Marina';

  useEffect(() => {
    if (!supabase) return;
    const fetchSettings = async () => {
      const { data: record } = await supabase.from('site_settings').select('data').eq('key', 'main').single();
      if (record?.data) setWebsiteSettings(record.data as FooterWebsiteSettings);
    };
    fetchSettings();
  }, [supabase]);

  const socialLinks = [
    { icon: Facebook, href: websiteSettings?.social_links?.facebook, label: 'Facebook' },
    { icon: Instagram, href: websiteSettings?.social_links?.instagram, label: 'Instagram' },
    { icon: Twitter, href: websiteSettings?.social_links?.twitter, label: 'Twitter' },
    { icon: Music, href: websiteSettings?.social_links?.tiktok, label: 'TikTok' },
  ].filter((item) => !!item.href);

  const serviceItems = [
    { label: dictionary?.explore?.houseboats || 'Houseboats', href: '/houseboats' },
    { label: 'River Cruise', href: '/river-cruise' },
    { label: dictionary?.explore?.restaurant || 'Restaurant', href: '/restaurant' },
  ];

  const exploreItems = [
    { label: dictionary?.explore?.home || 'Home', href: '/' },
    { label: dictionary?.explore?.contact || 'Contact', href: '/contact' },
    { label: dictionary?.legal?.privacy || 'Privacy Policy', href: '/privacy' },
    { label: dictionary?.legal?.terms || 'Terms of Service', href: '/terms' },
  ];

  const emailEntries = Array.from(new Set([websiteSettings?.email, 'geral@amieiramarina.com'].filter(Boolean) as string[]));
  const phoneEntries = Array.from(
    new Set([websiteSettings?.phone, '+351934343567', '+351933248039'].filter(Boolean) as string[])
  );

  return (
    <footer className="relative overflow-hidden bg-[#eef2f7] pt-14 pb-7 text-[#1f2937] md:pt-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="flex items-center gap-4">
              <Logo logoUrl={websiteSettings?.logoUrl} className="h-14 w-auto md:h-16" />
              {!websiteSettings?.logoUrl && (
                <div>
                  <p className="text-xl font-bold tracking-tight">{companyName}</p>
                  <p className="text-sm text-slate-500">Alqueva Lake Experiences</p>
                </div>
              )}
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              <span className="accent-highlight px-1.5 py-0.5 font-semibold">Cruise, dine, and stay on Alqueva Lake</span> with a simple booking flow for houseboats, restaurant experiences, and group river cruise plans.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href as string}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="accent-chip inline-flex h-10 w-10 items-center justify-center border-[#cde4c6] bg-[#f4fbf2] hover:bg-[#e7f4e3]"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f6a2c]">Contact</p>
            <div className="mt-4 space-y-3 text-sm">
              {emailEntries.map((email) => (
                <a key={email} href={`mailto:${email}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
                  <Mail className="accent-icon h-4 w-4" />
                  {email}
                </a>
              ))}
              {phoneEntries.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
                >
                  <PhoneCall className="accent-icon h-4 w-4" />
                  {phone}
                </a>
              ))}
              {websiteSettings?.address && (
                <p className="inline-flex items-start gap-2 text-slate-600">
                  <MapPin className="accent-icon mt-0.5 h-4 w-4" />
                  {websiteSettings.address}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f6a2c]">Services</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {serviceItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-slate-700 hover:text-[#2f6a2c]">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f6a2c]">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {exploreItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-slate-700 hover:text-[#2f6a2c]">{item.label}</Link>
                </li>
              ))}
            </ul>
            <Link href="/contact" className="cta-shimmer mt-5 inline-flex h-10 items-center rounded-full border-none px-5 text-sm font-semibold text-white">
              Contact Our Team
            </Link>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {companyName}. {dictionary?.rightsReserved || 'All rights reserved.'}</p>
          <p>Amieira Marina | Alqueva, Portugal</p>
        </div>
      </div>
    </footer>
  );
}
