'use client';

import Link from 'next/link';
import { Facebook, Instagram, Music, MapPin, Phone, Mail } from 'lucide-react';
import Logo from './logo';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useEffect, useState } from 'react';

type SocialLinks = {
  tiktok?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
};

type WebsiteSettings = {
  company_name: string;
  logoUrl: string;
  social_links: SocialLinks;
  address?: string;
  phone?: string;
  email?: string;
};

type FooterProps = {
  dictionary?: any;
}

export default function Footer({ dictionary }: FooterProps) {
  const { supabase } = useSupabase();
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const fetchSettings = async () => {
      // site_settings table structure is (key, data)
      const { data: record } = await supabase
        .from('site_settings')
        .select('data')
        .eq('key', 'main')
        .single();

      if (record && record.data) {
        setWebsiteSettings(record.data as any);
      }
    };
    fetchSettings();
  }, [supabase]);

  return (
    <footer className="relative py-12 bg-[#34C759]/10 overflow-hidden">
      {/* Background Accents - Reduced size/blur for compactness */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#34C759]/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#34C759]/5 blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">

          {/* Brand - Logo & Mission */}
          <div className="md:col-span-1">
            <div className="inline-block mb-4 hover:scale-105 transition-transform">
              <Logo logoUrl={websiteSettings?.logoUrl} className="h-14 w-auto" />
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4 font-medium max-w-xs">
              {dictionary?.tagline || 'Your gateway to unforgettable experiences on Alqueva Lake, Portugal.'}
            </p>

            {/* Socials - More compact style */}
            <div className="flex gap-2">
              {[
                { icon: Facebook, href: websiteSettings?.social_links?.facebook },
                { icon: Instagram, href: websiteSettings?.social_links?.instagram },
                { icon: Music, href: websiteSettings?.social_links?.tiktok }
              ].map((social, idx) => (
                social.href && (
                  <Link
                    key={idx}
                    href={social.href}
                    target="_blank"
                    className="w-9 h-9 rounded-xl bg-white flex items-center justify-center hover:bg-[#34C759] hover:text-white transition-all group"
                  >
                    <social.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Explore Section */}
          <div>
            <h4 className="font-display text-xl font-normal text-[#18230F] mb-4 tracking-wide">
              {dictionary?.explore?.title || 'Explore'}
            </h4>
            <ul className="space-y-2">
              {[
                { label: dictionary?.explore?.home || 'Home', href: '/' },
                { label: dictionary?.explore?.houseboats || 'Houseboats', href: '/houseboats' },
                { label: dictionary?.explore?.restaurant || 'Restaurant', href: '/restaurant' },
                { label: dictionary?.explore?.gallery || 'Gallery', href: '/gallery' }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="text-gray-600 hover:text-[#18230F] text-sm font-medium transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#34C759] scale-0 group-hover:scale-100 transition-transform" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h4 className="font-display text-xl font-normal text-[#18230F] mb-4 tracking-wide">
              {dictionary?.legal?.title || 'Legal'}
            </h4>
            <ul className="space-y-2">
              {[
                { label: dictionary?.explore?.contact || 'Contact Us', href: '/contact' },
                { label: dictionary?.legal?.privacy || 'Privacy Policy', href: '/privacy' },
                { label: dictionary?.legal?.terms || 'Terms of Service', href: '/terms' }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="text-gray-600 hover:text-[#18230F] text-sm font-medium transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#34C759] scale-0 group-hover:scale-100 transition-transform" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-display text-xl font-normal text-[#18230F] mb-4 tracking-wide">
              {dictionary?.connect?.title || 'Get in Touch'}
            </h4>
            <ul className="space-y-3">
              {websiteSettings?.address && (
                <li className="flex items-start gap-3 text-gray-600 group font-medium">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <MapPin className="w-4 h-4 text-[#34C759]" />
                  </div>
                  <span className="text-sm leading-tight">{websiteSettings?.address}</span>
                </li>
              )}
              {websiteSettings?.phone && (
                <li className="flex items-center gap-3 text-gray-600 group font-medium">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <Phone className="w-4 h-4 text-[#34C759]" />
                  </div>
                  <span className="text-sm">{websiteSettings?.phone}</span>
                </li>
              )}
              {websiteSettings?.email && (
                <li className="flex items-center gap-3 text-gray-600 group font-medium">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <Mail className="w-4 h-4 text-[#34C759]" />
                  </div>
                  <span className="text-sm break-all">{websiteSettings?.email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/5 flex justify-center">
          <p className="text-[#18230F]/60 text-xs font-medium italic">
            &copy; {new Date().getFullYear()} {websiteSettings?.company_name || 'Amieira Marina'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

