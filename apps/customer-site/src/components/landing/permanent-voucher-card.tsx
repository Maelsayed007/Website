'use client';

import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomepageVoucherItem } from '@/lib/types';

type PermanentVoucherCardProps = {
    voucher: HomepageVoucherItem;
    className?: string;
};

export default function PermanentVoucherCard({ voucher, className }: PermanentVoucherCardProps) {
    return (
        <article
            className={cn(
                'relative h-full min-h-[228px] overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_38px_-34px_rgba(19,32,68,0.42)] md:p-5',
                className
            )}
        >
            <div className="relative z-10 flex h-full flex-col">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    <Ticket className="h-3.5 w-3.5" />
                    Perminant offer
                </p>
                <h3 className="font-display mt-3 text-[1.35rem] font-semibold tracking-tight text-slate-900 md:text-[1.5rem]">
                    {voucher.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{voucher.rule}</p>
                <Link
                    href={voucher.ctaHref}
                    className="cta-shimmer mt-auto inline-flex items-center gap-1 self-start rounded-full px-4 py-2 text-sm font-semibold text-white"
                >
                    {voucher.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </article>
    );
}
