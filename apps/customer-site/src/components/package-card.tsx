'use client';

import { Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HouseboatSearchCard from '@/components/houseboat-search-card';
import { HouseboatModel } from '@/lib/types';

type BoatPackage = {
    id: string;
    boats: HouseboatModel[];
    totalCapacity: number;
    totalPrice: number;
};

interface PackageCardProps {
    pkg: BoatPackage;
    index: number;
    dateRange?: { from?: Date; to?: Date };
    guests: string;
}

export default function PackageCard({ pkg, index, dateRange, guests }: PackageCardProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price);
    };

    return (
        <div className="relative mt-8 bg-white rounded-3xl border-2 border-[#18230F] p-4 pt-6 md:p-6 shadow-none text-left">
            <div className="absolute -top-4 left-6 bg-white px-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Anchor className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-xl text-[#18230F]">Package {index + 1}</h3>
            </div>

            <div className="absolute -top-4 right-6 bg-white px-2 text-right">
                <div className="text-2xl font-black text-[#18230F] leading-none">{formatPrice(pkg.totalPrice)}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total Package</div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-2">
                {pkg.boats.map((boat, i) => (
                    <HouseboatSearchCard
                        key={`${pkg.id}-boat-${i}`}
                        boat={boat}
                        requestedGuests={0}
                        hidePrice={true}
                        dictionary={{ features: { guests: 'Guests', bedrooms: 'Bedrooms' } }}
                    />
                ))}
            </div>

            <div className="mt-6">
                <Button className="w-full h-12 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold rounded-xl text-base shadow-sm">
                    Book This Package
                </Button>
            </div>
        </div >
    );
}
