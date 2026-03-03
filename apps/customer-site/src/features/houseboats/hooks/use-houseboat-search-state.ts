'use client';

import { useState } from 'react';
import { parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

type UseHouseboatSearchStateArgs = {
  fromParam: string | null;
  toParam: string | null;
  guestsParam: string | null;
  boatsParam: string | null;
  typeParam: 'overnight' | 'day_charter' | null;
};

export function useHouseboatSearchState({
  fromParam,
  toParam,
  guestsParam,
  boatsParam,
  typeParam,
}: UseHouseboatSearchStateArgs) {
  const [bookingType, setBookingType] = useState<'overnight' | 'day_charter'>(typeParam || 'overnight');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (fromParam) {
      try {
        if (typeParam === 'day_charter') {
          return { from: parseISO(fromParam), to: parseISO(fromParam) };
        }
        if (toParam) {
          return { from: parseISO(fromParam), to: parseISO(toParam) };
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  const [guests, setGuests] = useState(guestsParam || '2');
  const [numberOfBoats, setNumberOfBoats] = useState(parseInt(boatsParam || '1') || 1);

  return {
    bookingType,
    setBookingType,
    dateRange,
    setDateRange,
    guests,
    setGuests,
    numberOfBoats,
    setNumberOfBoats,
  };
}
