'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, Bed, ArrowRight } from 'lucide-react';
import { HouseboatModel } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

type HouseboatCardProps = {
  houseboat: HouseboatModel & { calculatedPrice?: number, isAvailable?: boolean };
  price?: number;
  className?: string;
  isAvailable: boolean;
};

export default function HouseboatCard({ houseboat, price, className, isAvailable }: HouseboatCardProps) {
  const searchParams = useSearchParams();
  const { id, name, description, optimalCapacity, maximumCapacity, bedrooms, imageUrls } = houseboat;

  const images = imageUrls || [];
  const existingParams = new URLSearchParams(Array.from(searchParams.entries()));
  const detailLink = `/houseboats/${houseboat.id}?${existingParams.toString()}`;

  return (
    <Link href={detailLink} className={cn("group block h-full", className)}>
      <div className="h-full flex flex-col sm:flex-row bg-slate-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-slate-200 hover:border-slate-300">

        <div className="relative w-full sm:w-[35%] h-40 sm:h-auto min-h-[10rem] overflow-hidden bg-slate-200 flex-shrink-0">
          <Image
            src={images?.[0] || 'https://placehold.co/600x400'}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {!isAvailable && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-[1px]">
              <span className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded-full shadow-sm">
                Booked
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col justify-center min-w-0 bg-slate-100 w-full sm:w-[65%]">
          <div className="mb-2 text-left">
            <h3
              className="text-lg font-bold mb-1 line-clamp-1 group-hover:text-green-600 transition-colors text-slate-900"
            >
              {name}
            </h3>

            {description && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-tight font-medium">
                {description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-bold shadow-sm">
                <Users className="w-3 h-3 text-green-600" />
                {optimalCapacity}-{maximumCapacity}
              </div>
              {bedrooms && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-bold shadow-sm">
                  <Bed className="w-3 h-3 text-green-600" />
                  {bedrooms}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-2 flex items-center text-xs font-bold text-green-600 group-hover:translate-x-1 transition-transform">
            View Details <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}