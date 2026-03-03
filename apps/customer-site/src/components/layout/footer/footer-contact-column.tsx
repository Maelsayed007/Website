'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import type { FooterDictionary, FooterWebsiteSettings } from './types';

type FooterContactColumnProps = {
  websiteSettings: FooterWebsiteSettings | null;
  dictionary?: FooterDictionary;
};

export function FooterContactColumn({ websiteSettings, dictionary }: FooterContactColumnProps) {
  return (
    <div>
      <h4 className="font-display text-[1.15rem] font-semibold text-white mb-4 tracking-tight">
        {dictionary?.connect?.title || 'Get in Touch'}
      </h4>
      <ul className="space-y-3.5">
        {websiteSettings?.address && (
          <li className="flex items-start gap-3 text-slate-100/85 group font-medium">
            <div className="w-8 h-8 rounded-[0.7rem] bg-white/12 border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:border-brand-primary transition-colors">
              <MapPin className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="text-sm leading-tight">{websiteSettings.address}</span>
          </li>
        )}
        {websiteSettings?.phone && (
          <li className="flex items-center gap-3 text-slate-100/85 group font-medium">
            <div className="w-8 h-8 rounded-[0.7rem] bg-white/12 border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:border-brand-primary transition-colors">
              <Phone className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="text-sm">{websiteSettings.phone}</span>
          </li>
        )}
        {websiteSettings?.email && (
          <li className="flex items-center gap-3 text-slate-100/85 group font-medium">
            <div className="w-8 h-8 rounded-[0.7rem] bg-white/12 border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:border-brand-primary transition-colors">
              <Mail className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="text-sm break-all">{websiteSettings.email}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
