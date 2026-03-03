'use client';

import { useMemo } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { Booking, HouseboatModel } from '@/lib/types';

type BoatUnit = {
  id: string;
  model_id: string;
  name: string;
};

export type BoatPackage = {
  id: string;
  boats: HouseboatModel[];
  totalCapacity: number;
  totalOptimalCapacity: number;
  totalPrice: number;
};

type UseBoatPackageGenerationArgs = {
  numberOfBoats: number;
  isSearchMode: boolean;
  guests: string;
  processedHouseboats: HouseboatModel[];
  boatUnits: BoatUnit[];
  allBookings: Booking[];
  dateRange?: DateRange;
};

const ACTIVE_BOOKING_STATUSES: Booking['status'][] = ['Confirmed', 'Pending'];

function getPerBoatGuestLimit(boat: HouseboatModel) {
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

function getCombinations(arr: HouseboatModel[], k: number): HouseboatModel[][] {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map((item) => [item]);

  const result: HouseboatModel[][] = [];
  const indices = Array.from({ length: k }, (_, i) => i);

  while (indices[0] <= arr.length - k) {
    result.push(indices.map((index) => arr[index]));

    let pointer = k - 1;
    while (pointer >= 0 && indices[pointer] === arr.length - k + pointer) {
      pointer -= 1;
    }

    if (pointer < 0) {
      break;
    }

    indices[pointer] += 1;
    for (let next = pointer + 1; next < k; next += 1) {
      indices[next] = indices[next - 1] + 1;
    }
  }

  return result;
}

export function useBoatPackageGeneration({
  numberOfBoats,
  isSearchMode,
  guests,
  processedHouseboats,
  boatUnits,
  allBookings,
  dateRange,
}: UseBoatPackageGenerationArgs) {
  const generatedPackages = useMemo(() => {
    if (numberOfBoats <= 1 || !isSearchMode) {
      return [] as BoatPackage[];
    }

    const availableBoatsPool: HouseboatModel[] = [];
    const guestCount = parseInt(guests, 10) || 2;

    processedHouseboats.forEach((model) => {
      const modelUnits = boatUnits.filter((unit) => unit.model_id === model.id);
      const totalUnitsCount = modelUnits.length > 0 ? modelUnits.length : 1;

      let bookedCount = 0;
      if (dateRange?.from && dateRange?.to) {
        const requestedInterval = { start: dateRange.from, end: dateRange.to };

        bookedCount = modelUnits.filter((unit) => {
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
      }

      const availableCount = Math.max(0, totalUnitsCount - bookedCount);
      for (let index = 0; index < availableCount; index += 1) {
        availableBoatsPool.push(model);
      }
    });

    if (availableBoatsPool.length < numberOfBoats) {
      return [] as BoatPackage[];
    }

    const maxBoatsToUse = Math.min(numberOfBoats, availableBoatsPool.length, 6);
    const combinations = getCombinations(availableBoatsPool, maxBoatsToUse);

    const packages = combinations
      .map((combo, index) => {
        const totalCapacity = combo.reduce((sum, boat) => sum + getPerBoatGuestLimit(boat), 0);
        const totalOptimalCapacity = combo.reduce((sum, boat) => sum + (boat.optimalCapacity || 4), 0);
        const totalPrice = combo.reduce((sum, boat) => sum + (boat.totalPrice || 0), 0);

        return {
          id: `pkg-${index}`,
          boats: combo,
          totalCapacity,
          totalOptimalCapacity,
          totalPrice,
        };
      })
      .filter((pkg) => {
        const minConfiguration = guestCount;
        const maxConfiguration = guestCount + 2;
        return pkg.totalOptimalCapacity >= minConfiguration && pkg.totalOptimalCapacity <= maxConfiguration;
      });

    const uniquePackagesMap = new Map<string, BoatPackage>();
    packages.forEach((pkg) => {
      const compositionKey = pkg.boats
        .map((boat) => boat.id)
        .sort()
        .join('|');

      if (!uniquePackagesMap.has(compositionKey)) {
        uniquePackagesMap.set(compositionKey, pkg);
      }
    });

    return Array.from(uniquePackagesMap.values())
      .sort((a, b) => {
        const capacityDeltaA = a.totalCapacity - guestCount;
        const capacityDeltaB = b.totalCapacity - guestCount;
        return capacityDeltaA - capacityDeltaB || a.totalPrice - b.totalPrice;
      })
      .slice(0, 5);
  }, [allBookings, boatUnits, dateRange, guests, isSearchMode, numberOfBoats, processedHouseboats]);

  return {
    generatedPackages,
  };
}
