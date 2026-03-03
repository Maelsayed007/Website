'use client';

import { Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HouseboatSearchCard from '@/components/houseboat-search-card';
import { HouseboatModel } from '@/lib/types';
import { DateRange } from 'react-day-picker';

type BoatPackage = {
    id: string;
    boats: HouseboatModel[];
    totalCapacity: number;
    totalPrice: number;
};

interface PackageCardProps {
    pkg: BoatPackage;
    index: number;
    dateRange?: DateRange;
    guests?: string;
}

export default function PackageCard({ pkg, index }: PackageCardProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price);
    };

    return (
        <div className="mt-6 rounded-2xl border border-slate-300/60 bg-white p-5 text-left md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef3ff] text-[#2b5fd8]">
                        <Anchor className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0e1738]">Package {index + 1}</h3>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black leading-none text-[#0e1738]">{formatPrice(pkg.totalPrice)}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total package</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {pkg.boats.map((boat, i) => (
                    <HouseboatSearchCard
                        key={`${pkg.id}-boat-${i}`}
                        boat={boat}
                        requestedGuests={0}
                        hidePrice={true}
                    />
                ))}
            </div>

            <div className="mt-6">
                <Button className="cta-shimmer h-12 w-full rounded-xl text-base font-bold text-white">
                    Book This Package
                </Button>
            </div>
        </div>
    );
}
