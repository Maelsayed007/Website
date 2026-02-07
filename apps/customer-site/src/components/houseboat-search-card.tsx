'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Anchor, MapPin, Users, Bed, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HouseboatModel } from '@/lib/types';

interface HouseboatSearchCardProps {
  boat: HouseboatModel & {
    totalPrice?: number;
    pricePerNight?: number;
    isAvailable?: boolean
  };
  requestedGuests?: number;
  hidePrice?: boolean;
  dictionary: any;
}

export default function HouseboatSearchCard({ boat, requestedGuests, hidePrice = false, dictionary }: HouseboatSearchCardProps) {
  const searchParams = useSearchParams();
  const images = boat.imageUrls || [];
  const displayImage = images.length > 0 ? images[0] : null;

  // Format price
  const priceDisplay = boat.totalPrice
    ? `€${boat.totalPrice.toLocaleString()}`
    : `€${boat.pricePerNight || 150}`;

  const pricePeriod = boat.totalPrice ? 'total' : 'night';

  const detailUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return `/houseboats/${boat.slug || boat.id}?${params.toString()}`;
  }, [boat.slug, boat.id, searchParams]);

  return (
    <Link
      href={detailUrl}
      className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-2xl border border-gray-100 transition-all duration-500 overflow-hidden min-h-[320px] md:min-h-[145px] hover:border-emerald-500/40"
    >
      <div className="relative w-full md:w-[190px] h-40 md:h-auto bg-gray-100 overflow-hidden shrink-0">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={boat.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, 190px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 bg-emerald-50/50">
            <Anchor className="w-8 h-8 opacity-20 text-emerald-600" />
          </div>
        )}
      </div>

      <div className="flex-1 p-3 md:p-4 flex flex-col relative text-left">
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-display text-xl md:text-2xl font-bold text-[#18230F] leading-tight truncate">
              {boat.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amieira Marina</span>
            </div>
          </div>

          {!hidePrice && (
            <div className="text-right shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-2xl md:text-3xl font-black text-[#18230F] leading-none">{priceDisplay}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
                  {pricePeriod === 'total' ? 'Total Stay' : 'Starting Price'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-auto py-2.5 border-t border-gray-50">
          <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
            <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#34C759]" />
            </div>
            <span className="font-semibold whitespace-nowrap">
              {boat.optimalCapacity} {dictionary?.features?.guests || 'Guests'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
            <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
              <Bed className="w-4 h-4 text-[#34C759]" />
            </div>
            <span className="font-semibold whitespace-nowrap">{boat.bedrooms} {dictionary?.features?.bedrooms || 'Bedrooms'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
            <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
              <Bath className="w-4 h-4 text-[#34C759]" />
            </div>
            <span className="font-semibold whitespace-nowrap">{boat.bathrooms || 1} Bath</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
          {(requestedGuests || 0) > 0 && boat.optimalCapacity && requestedGuests! > boat.optimalCapacity && (
            <span className="bg-[#18230F] text-white rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap font-medium">
              + {requestedGuests! - boat.optimalCapacity} Guests with extra bed
            </span>
          )}
          <Button asChild className="h-10 px-8 bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold rounded-full text-sm shadow-none transition-all hover:shadow-md">
            <span>View details</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}