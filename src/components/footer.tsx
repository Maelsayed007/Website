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
    <footer className="bg-[#0B1120] text-white border-t border-gray-800">
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand - Logo Only */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-6">
              <Logo logoUrl={websiteSettings?.logoUrl} />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your gateway to unforgettable experiences on Alqueva Lake.
            </p>
            {/* Socials */}
            <div className="flex gap-3">
              {websiteSettings?.social_links?.facebook && (
                <Link href={websiteSettings.social_links.facebook} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                  <Facebook className="w-5 h-5" />
                </Link>
              )}
              {websiteSettings?.social_links?.instagram && (
                <Link href={websiteSettings.social_links.instagram} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                  <Instagram className="w-5 h-5" />
                </Link>
              )}
              {websiteSettings?.social_links?.tiktok && (
                <Link href={websiteSettings.social_links.tiktok} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                  <Music className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-6">Explore</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-gray-300 hover:text-white text-sm transition-colors">Home</Link></li>
              <li><Link href="/houseboats" className="text-gray-300 hover:text-white text-sm transition-colors">Houseboats</Link></li>
              <li><Link href="/restaurant" className="text-gray-300 hover:text-white text-sm transition-colors">Restaurant</Link></li>
              <li><Link href="/gallery" className="text-gray-300 hover:text-white text-sm transition-colors">Gallery</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/contact" className="text-gray-300 hover:text-white text-sm transition-colors">Contact Us</Link></li>
              <li><Link href="/privacy" className="text-gray-300 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-300 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact - Pulled from Settings */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-6">Contact</h4>
            <ul className="space-y-4">
              {websiteSettings?.address && (
                <li className="flex items-start gap-3 text-gray-300 text-sm">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-gray-500" />
                  <span>{websiteSettings.address}</span>
                </li>
              )}
              {websiteSettings?.phone && (
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <Phone className="w-5 h-5 shrink-0 text-gray-500" />
                  <span>{websiteSettings.phone}</span>
                </li>
              )}
              {websiteSettings?.email && (
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <Mail className="w-5 h-5 shrink-0 text-gray-500" />
                  <span>{websiteSettings.email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-8 text-center bg-[#0B1120]">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} {websiteSettings?.company_name || 'Amieira Marina'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
