'use client';

import Link from 'next/link';
import { Facebook, Instagram, Music } from 'lucide-react';
import Logo from '@/components/logo';
import type { FooterDictionary, FooterWebsiteSettings } from './types';

type FooterBrandColumnProps = {
  websiteSettings: FooterWebsiteSettings | null;
  dictionary?: FooterDictionary;
};

export function FooterBrandColumn({ websiteSettings, dictionary }: FooterBrandColumnProps) {
  return (
    <div className="md:col-span-1">
      <div className="inline-block mb-5 hover:scale-[1.03] transition-transform">
        <Logo logoUrl={websiteSettings?.logoUrl} className="h-14 w-auto" />
      </div>
      <p className="text-slate-100/90 text-sm leading-relaxed mb-5 font-medium max-w-xs">
        {dictionary?.tagline || 'Your gateway to unforgettable experiences on Alqueva Lake, Portugal.'}
      </p>

      <div className="flex gap-2.5">
        {[
          { icon: Facebook, href: websiteSettings?.social_links?.facebook },
          { icon: Instagram, href: websiteSettings?.social_links?.instagram },
          { icon: Music, href: websiteSettings?.social_links?.tiktok },
        ].map((social, idx) =>
          social.href ? (
            <Link
              key={idx}
              href={social.href}
              target="_blank"
              className="w-9 h-9 rounded-[0.85rem] bg-white/12 border border-white/20 text-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all group"
            >
              <social.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            </Link>
          ) : null
        )}
      </div>
    </div>
  );
}
