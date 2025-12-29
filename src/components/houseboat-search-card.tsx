'use client';

import Image from 'next/image';
import { Users, Bed, Anchor, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HouseboatModel } from '@/lib/data-firestore';

interface HouseboatSearchCardProps {
  boat: HouseboatModel & {
    totalPrice?: number;
    pricePerNight?: number;
    isAvailable?: boolean
  };
  onSelect?: (boat: any) => void;
}

export default function HouseboatSearchCard({ boat, onSelect }: HouseboatSearchCardProps) {
  const images = boat.imageUrls || boat.images || [];
  const displayImage = images.length > 0 ? images[0] : null;
  const isAvailable = boat.isAvailable !== false;

  // Format price
  const priceDisplay = boat.totalPrice
    ? `€${boat.totalPrice.toLocaleString()}`
    : `€${boat.pricePerNight || boat.startingPrice || 150}`;

  const pricePeriod = boat.totalPrice ? 'total' : 'night';

  return (
    <div
      onClick={() => onSelect?.(boat)}
      className="group cursor-pointer flex flex-col gap-3"
    >
      {/* 1. IMAGE CONTAINER - Stronger Border & Shadow */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50 shadow-sm border border-gray-200 group-hover:shadow-md group-hover:border-green-500/50 transition-all duration-300">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={boat.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <Anchor className="w-12 h-12 opacity-20" />
          </div>
        )}

        {/* Status Badge - Floating */}
        {!isAvailable && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-red-600 shadow-sm border border-red-100">
            Sold Out
          </div>
        )}

        {/* Favorite Button (Visual Only) */}
        <button className="absolute top-3 right-3 text-white/90 hover:text-white hover:scale-110 transition-all drop-shadow-md">
          <Heart className="w-6 h-6 fill-black/20 stroke-white stroke-[2px]" />
        </button>
      </div>

      {/* 2. INFO SECTION - Better Contrast */}
      <div className="flex flex-col gap-1 px-1">

        {/* Header */}
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-green-700 transition-colors">
            {boat.name}
          </h3>
          {/* Reviews removed */}
        </div>

        {/* Subtitle / Capacity */}
        <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
          <span>{boat.optimalCapacity}-{boat.maximumCapacity} guests</span>
          <span className="text-gray-300">•</span>
          <span>{boat.bedrooms} cabins</span>
        </div>

        {/* Price - Bottom */}
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-bold text-gray-900 text-base">{priceDisplay}</span>
          <span className="text-gray-500 text-sm font-normal">{pricePeriod}</span>
        </div>

      </div>
    </div>
  );
}