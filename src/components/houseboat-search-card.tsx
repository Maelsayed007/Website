'use client';

import Image from 'next/image';
import { Users, Bed, Anchor, Star, Heart, Utensils, Droplets } from 'lucide-react';
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
      className="group cursor-pointer flex flex-row bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300 overflow-hidden h-48 md:h-[200px]"
    >
      {/* 1. IMAGE CONTAINER - Left Side (Fixed Width) */}
      <div className="relative w-2/5 min-w-[140px] md:min-w-[180px] h-full bg-gray-100 shrink-0">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={boat.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 40vw, 300px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <Anchor className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>

      {/* 2. INFO SECTION - Right Side */}
      <div className="flex-1 p-3 md:p-4 flex flex-col relative w-3/5">

        {/* Top Row: Title & Price */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-[#202124] text-base md:text-lg leading-tight truncate pr-2">
              {boat.name}
            </h3>
            {/* Real Data Subtitle (Optional, replacing rating) */}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
              <span>Houseboat</span>
            </div>
          </div>

          {/* Price - Top Right as per design */}
          <div className="text-right shrink-0">
            <span className="block font-bold text-gray-900 text-lg md:text-xl">{priceDisplay}</span>
          </div>
        </div>

        {/* Middle: Amenities Grid (Real Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 mt-3 mb-2">
          <div className="flex items-center gap-2 text-xs md:text-[13px] text-gray-600 truncate">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{boat.optimalCapacity}-{boat.maximumCapacity} guests</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-[13px] text-gray-600 truncate">
            <Bed className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{boat.bedrooms} cabins</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-[13px] text-gray-600 truncate">
            <Droplets className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{boat.bathrooms || 1} bathrooms</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-[13px] text-gray-600 truncate">
            <Utensils className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{boat.kitchens || 1} kitchen</span>
          </div>
        </div>

        {/* Bottom: Button aligned right */}
        <div className="mt-auto flex justify-end">
          <Button className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm shadow-sm transition-all text-[13px]">
            View prices
          </Button>
        </div>

      </div>
    </div>
  );
}