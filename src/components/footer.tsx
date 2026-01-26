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
    <footer className="relative py-24 bg-[#34C759]/20 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#34C759]/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#34C759]/10 blur-[120px] rounded-full -ml-40 -mb-40 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">

          {/* Brand - Logo & Mission */}
          <div className="md:col-span-1">
            <div className="inline-block mb-10 hover:scale-105 transition-transform">
              <Logo logoUrl={websiteSettings?.logoUrl} className="h-16 w-auto" />
            </div>
            <p className="text-gray-700 text-lg leading-relaxed mb-8 font-medium">
              Your gateway to unforgettable experiences on Alqueva Lake, Portugal.
            </p>

            {/* Socials - Clean Style */}
            <div className="flex gap-4">
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
                    className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center hover:bg-[#34C759] hover:text-white transition-all group"
                  >
                    <social.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Explore Section */}
          <div>
            <h4 className="font-display text-2xl font-normal text-[#18230F] mb-8 tracking-wide">Explore</h4>
            <ul className="space-y-4">
              {[
                { label: 'Home', href: '/' },
                { label: 'Houseboats', href: '/houseboats' },
                { label: 'Restaurant', href: '/restaurant' },
                { label: 'Gallery', href: '/gallery' }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="text-gray-700 hover:text-[#18230F] text-base font-medium transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] scale-0 group-hover:scale-100 transition-transform shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h4 className="font-display text-2xl font-normal text-[#18230F] mb-8 tracking-wide">Legal</h4>
            <ul className="space-y-4">
              {[
                { label: 'Contact Us', href: '/contact' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="text-gray-700 hover:text-[#18230F] text-base font-medium transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] scale-0 group-hover:scale-100 transition-transform shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-display text-2xl font-normal text-[#18230F] mb-8 tracking-wide">Get in Touch</h4>
            <ul className="space-y-6">
              {websiteSettings?.address && (
                <li className="flex items-start gap-4 text-gray-700 group font-medium">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <MapPin className="w-5 h-5 text-[#34C759]" />
                  </div>
                  <span className="text-base leading-snug">{websiteSettings?.address}</span>
                </li>
              )}
              {websiteSettings?.phone && (
                <li className="flex items-center gap-4 text-gray-700 group font-medium">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <Phone className="w-5 h-5 text-[#34C759]" />
                  </div>
                  <span className="text-base">{websiteSettings?.phone}</span>
                </li>
              )}
              {websiteSettings?.email && (
                <li className="flex items-center gap-4 text-gray-700 group font-medium">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:bg-[#34C759]/10 transition-colors">
                    <Mail className="w-5 h-5 text-[#34C759]" />
                  </div>
                  <span className="text-base break-all">{websiteSettings?.email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-black/10 flex justify-center">
          <p className="text-[#18230F] text-sm font-semibold italic">
            &copy; {new Date().getFullYear()} {websiteSettings?.company_name || 'Amieira Marina'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

