'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Anchor, MapPin } from 'lucide-react';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { HouseboatModel } from '@/lib/types';
import { applyHouseboatRecurringDiscount } from '@/lib/booking-rules';

interface HouseboatSearchCardProps {
  boat: HouseboatModel & {
    totalPrice?: number;
    pricePerNight?: number;
    isAvailable?: boolean;
  };
  requestedGuests?: number;
  hidePrice?: boolean;
}

export default function HouseboatSearchCard({
  boat,
  requestedGuests,
  hidePrice = false,
}: HouseboatSearchCardProps) {
  const searchParams = useSearchParams();
  const images = boat.imageUrls || [];
  const displayImage = images.length > 0 ? images[0] : null;

  const bookingType = searchParams.get('type') === 'day_charter' ? 'day_charter' : 'overnight';
  const checkInParam = searchParams.get('from');
  const checkOutParam = searchParams.get('to');
  const guestsFromSearch = parseInt(searchParams.get('guests') || `${requestedGuests || 0}`, 10) || (requestedGuests || 0);

  const priceDisplay = boat.totalPrice
    ? `EUR ${Math.round(boat.totalPrice).toLocaleString()}`
    : `EUR ${Math.round(boat.pricePerNight || 150).toLocaleString()}`;

  const pricePeriod = boat.totalPrice ? 'total' : 'night';

  const recurringOffer = useMemo(() => {
    if (bookingType !== 'overnight' || !checkInParam) return null;
    const checkInDate = parseISO(checkInParam);
    if (!isValid(checkInDate)) return null;
    const checkOutDate = checkOutParam ? parseISO(checkOutParam) : null;
    const nights = checkOutDate && isValid(checkOutDate)
      ? Math.max(0, differenceInCalendarDays(checkOutDate, checkInDate))
      : 0;

    const basePrice = Number(boat.pricePerNight || 0);
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

    const result = applyHouseboatRecurringDiscount({
      bookingType: 'overnight',
      baseOvernightPrice: basePrice,
      bookingDate: new Date(),
      checkInDate,
      guests: guestsFromSearch,
      nights,
    });

    return result.applies ? result : null;
  }, [boat.pricePerNight, bookingType, checkInParam, checkOutParam, guestsFromSearch]);

  const detailUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return `/houseboats/${boat.slug || boat.id}?${params.toString()}`;
  }, [boat.slug, boat.id, searchParams]);

  const amenityLabelMap: Record<string, string> = {
    wifi: 'Wi-Fi',
    tv: 'TV',
    kitchen: 'Kitchen',
    ac: 'A/C',
    heating: 'Heating',
    grill: 'Grill',
    'sun-deck': 'Sun deck',
  };

  const shortDescription = boat.description?.trim() || 'Comfortable lake living with practical interiors and easy navigation.';
  const amenityList = (boat.amenities || []).slice(0, 4).map((amenity) => amenityLabelMap[amenity] || amenity);
  const extraGuestCount =
    (requestedGuests || 0) > 0 && boat.optimalCapacity
      ? Math.min(2, Math.max(0, requestedGuests! - boat.optimalCapacity))
      : 0;

  return (
    <Link
      href={detailUrl}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-300/60 bg-white transition-colors duration-300 hover:border-[#2b5fd8]/45 md:min-h-[228px] md:flex-row"
    >
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-100 md:h-auto md:w-[320px]">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={boat.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 text-gray-300">
            <Anchor className="w-8 h-8 opacity-20 text-slate-500" />
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-4 text-left md:p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-bold leading-tight text-[#1f4ea8]">
              {boat.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amieira Marina</span>
            </div>
            {recurringOffer && (
              <p className="mt-2 text-[11px] font-semibold text-[#2b5fd8]">
                Eligible permanent offer: up to -{recurringOffer.discountPercent}%
              </p>
            )}
          </div>

          {!hidePrice && (
            <div className="shrink-0 text-right">
              <div className="flex flex-col items-end">
                <span className="font-display text-2xl font-bold leading-none text-[#1f4ea8] md:text-3xl">{priceDisplay}</span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {pricePeriod === 'total' ? 'Total stay' : 'Per night'}
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="line-clamp-1 text-sm leading-relaxed text-slate-600 md:text-[15px]">
          {shortDescription}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Ideal</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{boat.optimalCapacity} guests</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bedrooms</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{boat.bedrooms}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bathrooms</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{boat.bathrooms}</p>
          </div>
        </div>

        {amenityList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {amenityList.map((amenity) => (
              <span
                key={`${boat.id}-${amenity}`}
                className="rounded-full border border-[#2b5fd8]/20 bg-[#eef3ff] px-2.5 py-1 text-[11px] font-semibold text-[#2b5fd8]"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          {extraGuestCount > 0 && (
            <span className="whitespace-nowrap rounded-full bg-[#0e1738] px-2 py-0.5 text-[10px] font-medium text-white">
              + {extraGuestCount} guests with extra bed
            </span>
          )}
          <Button asChild className="cta-shimmer h-10 rounded-xl px-8 text-sm font-bold text-white shadow-none transition-all">
            <span>View details</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}
