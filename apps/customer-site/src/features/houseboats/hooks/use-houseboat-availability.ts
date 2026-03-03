'use client';

import { useMemo } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { Booking, HouseboatModel } from '@/lib/types';
import type { HouseboatPricingBreakdown } from './use-houseboat-pricing';

type HouseboatPricingResult = {
  pricePerNight: number;
  totalPrice?: number;
  breakdown?: HouseboatPricingBreakdown;
};

type BoatUnit = {
  id: string;
  model_id: string;
  name: string;
};

type UseHouseboatAvailabilityArgs = {
  houseboats: HouseboatModel[];
  boatUnits: BoatUnit[];
  allBookings: Booking[];
  bookingType: 'overnight' | 'day_charter';
  dateRange?: DateRange;
  guests: string;
  isSearchMode: boolean;
  numberOfBoats: number;
  pricingByModelId: Record<string, HouseboatPricingResult>;
};

const ACTIVE_BOOKING_STATUSES: Booking['status'][] = ['Confirmed', 'Pending'];

function getSingleBoatGuestLimit(boat: HouseboatModel) {
  const optimal = boat.optimalCapacity || 4;
  const maximum = boat.maximumCapacity || 6;
  return Math.min(maximum, optimal + 2);
}

function hasRequestedIntervalOverlap({
  booking,
  requestedInterval,
}: {
  booking: Booking;
  requestedInterval: { start: Date; end: Date };
}) {
  const start = parseISO(booking.startTime);
  const end = parseISO(booking.endTime);

  return (
    isWithinInterval(requestedInterval.start, { start, end }) ||
    isWithinInterval(requestedInterval.end, { start, end }) ||
    isWithinInterval(start, { start: requestedInterval.start, end: requestedInterval.end })
  );
}

export function useHouseboatAvailability({
  houseboats,
  boatUnits,
  allBookings,
  bookingType,
  dateRange,
  guests,
  isSearchMode,
  numberOfBoats,
  pricingByModelId,
}: UseHouseboatAvailabilityArgs) {
  const processedHouseboats = useMemo(() => {
    if (!houseboats.length) {
      return [] as HouseboatModel[];
    }

    const guestCount = parseInt(guests, 10) || 2;

    return houseboats
      .map((boat) => {
        const pricing = pricingByModelId[boat.id] || { pricePerNight: 150 };

        let isAvailable = true;

        if (isSearchMode) {
          if (bookingType === 'day_charter' && !boat.diaria_enabled) {
            isAvailable = false;
          }

          if (isAvailable && numberOfBoats === 1 && guestCount > getSingleBoatGuestLimit(boat)) {
            isAvailable = false;
          }

          if (isAvailable && dateRange?.from && dateRange?.to) {
            const requestedInterval = { start: dateRange.from, end: dateRange.to };
            const modelUnits = boatUnits.filter((unit) => unit.model_id === boat.id);

            if (modelUnits.length === 0) {
              isAvailable = false;
            } else {
              const busyUnitsCount = modelUnits.filter((unit) => {
                const unitBookings = allBookings.filter(
                  (booking) => booking.houseboatId === unit.id && ACTIVE_BOOKING_STATUSES.includes(booking.status)
                );

                return unitBookings.some((booking) =>
                  hasRequestedIntervalOverlap({
                    booking,
                    requestedInterval,
                  })
                );
              }).length;

              if (busyUnitsCount >= modelUnits.length) {
                isAvailable = false;
              }
            }
          }
        }

        return {
          ...boat,
          optimalCapacity: boat.optimalCapacity || 4,
          maximumCapacity: boat.maximumCapacity || 6,
          imageUrls: boat.imageUrls || [],
          pricePerNight: pricing.pricePerNight,
          totalPrice: pricing.totalPrice,
          breakdown: pricing.breakdown,
          isAvailable,
          slug: boat.slug || boat.id,
          singleBeds: boat.singleBeds || 0,
          doubleBeds: boat.doubleBeds || boat.bedrooms || 0,
          amenities: boat.amenities || [],
          licenseRequired: true,
        };
      })
      .filter((boat) => !isSearchMode || boat.isAvailable)
      .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
  }, [allBookings, boatUnits, bookingType, dateRange, guests, houseboats, isSearchMode, numberOfBoats, pricingByModelId]);

  const guestWarning = useMemo(() => {
    const guestCount = parseInt(guests, 10) || 0;
    const maxSingleBoatLimit = houseboats.reduce((max, boat) => Math.max(max, getSingleBoatGuestLimit(boat)), 0);

    if (guestCount > 100) {
      return 'Guest count is limited to 100 for online booking.';
    }
    if (numberOfBoats === 1 && guestCount > 0 && maxSingleBoatLimit > 0 && guestCount > maxSingleBoatLimit) {
      return 'Each houseboat supports up to 2 extra-bed guests above optimal capacity.';
    }
    if (numberOfBoats > 1 && guestCount > 0 && processedHouseboats.length === 0 && isSearchMode) {
      return 'No matching boats for this guest and boat count. Try fewer boats or different dates.';
    }
    return '';
  }, [guests, houseboats, isSearchMode, numberOfBoats, processedHouseboats.length]);

  return {
    processedHouseboats,
    guestWarning,
  };
}
