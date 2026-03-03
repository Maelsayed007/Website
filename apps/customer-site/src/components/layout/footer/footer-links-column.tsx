'use client';

import Link from 'next/link';

type FooterLinksColumnProps = {
  title: string;
  items: Array<{ label: string; href: string }>;
};

export function FooterLinksColumn({ title, items }: FooterLinksColumnProps) {
  return (
    <div>
      <h4 className="font-display text-[1.15rem] font-semibold text-white mb-4 tracking-tight">{title}</h4>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li key={`${item.href}-${idx}`}>
            <Link
              href={item.href}
              className="text-slate-100/80 hover:text-white text-sm font-medium transition-colors flex items-center gap-2.5 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent scale-0 group-hover:scale-100 transition-transform" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
