'use client';

import { useMemo } from 'react';
import { eachDayOfInterval, getDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { HouseboatModel } from '@/lib/types';

type HouseboatPrice = {
  model_id: string;
  weekday_price: number;
  weekend_price: number;
};

export type HouseboatPricingBreakdown = {
  weekdayNights: number;
  weekdayPrice: number;
  weekendNights: number;
  weekendPrice: number;
  preparationFee: number;
  total: number;
  deposit: number;
};

type HouseboatPricingResult = {
  pricePerNight: number;
  totalPrice?: number;
  breakdown?: HouseboatPricingBreakdown;
};

type UseHouseboatPricingArgs = {
  houseboats: HouseboatModel[];
  prices: HouseboatPrice[];
  bookingType: 'overnight' | 'day_charter';
  dateRange?: DateRange;
  isSearchMode: boolean;
};

export function useHouseboatPricing({
  houseboats,
  prices,
  bookingType,
  dateRange,
  isSearchMode,
}: UseHouseboatPricingArgs) {
  const bookingNights = useMemo(() => {
    if (!isSearchMode || !dateRange?.from || !dateRange?.to) {
      return [] as Date[];
    }

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.slice(0, -1);
  }, [dateRange, isSearchMode]);

  const pricingByModelId = useMemo(() => {
    return houseboats.reduce<Record<string, HouseboatPricingResult>>((acc, boat) => {
      const modelPrices = prices.filter((price) => price.model_id === boat.id);
      const priceObj = modelPrices[0] || { weekday_price: 150, weekend_price: 150 };

      let totalPrice: number | undefined;
      let breakdown: HouseboatPricingBreakdown | undefined;

      if (isSearchMode && (bookingType === 'day_charter' ? dateRange?.from : bookingNights.length > 0)) {
        if (bookingType === 'day_charter') {
          totalPrice = boat.diaria_price || 0;
          breakdown = {
            weekdayNights: 0,
            weekdayPrice: 0,
            weekendNights: 0,
            weekendPrice: 0,
            preparationFee: 0,
            total: totalPrice,
            deposit: Math.ceil(totalPrice * 0.3),
          };
        } else {
          let weekdayCount = 0;
          let weekendCount = 0;

          bookingNights.forEach((nightDate) => {
            const day = getDay(nightDate);
            if (day === 5 || day === 6) {
              weekendCount += 1;
            } else {
              weekdayCount += 1;
            }
          });

          const weekdaysCost = weekdayCount * (priceObj.weekday_price || 0);
          const weekendsCost = weekendCount * (priceObj.weekend_price || 0);
          const preparationFee = 76;

          totalPrice = weekdaysCost + weekendsCost + preparationFee;
          breakdown = {
            weekdayNights: weekdayCount,
            weekdayPrice: priceObj.weekday_price || 0,
            weekendNights: weekendCount,
            weekendPrice: priceObj.weekend_price || 0,
            preparationFee,
            total: totalPrice,
            deposit: Math.ceil(totalPrice * 0.3),
          };
        }
      }

      acc[boat.id] = {
        pricePerNight: priceObj.weekday_price || 150,
        totalPrice,
        breakdown,
      };

      return acc;
    }, {});
  }, [bookingNights, bookingType, dateRange, houseboats, isSearchMode, prices]);

  return {
    pricingByModelId,
  };
}
