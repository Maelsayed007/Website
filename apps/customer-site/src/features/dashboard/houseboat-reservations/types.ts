import type { Boat, Booking, HouseboatModel } from '@/lib/types';

export type HouseboatReservationZoom = 'week' | 'month' | 'quarter' | 'year';

export type SourceFilterId = 'website' | 'nicols' | 'diaria' | 'ancorado' | 'amieira' | 'manual';

export type MappedBooking = Booking & {
  houseboatId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  startTime: string;
  endTime: string;
  numberOfGuests?: number;
  selectedExtras?: string[];
};

export type CalendarProcessedBooking = MappedBooking & {
  left: number;
  width: number;
  top: number;
  boatIndex: number;
  startSlotIndex: number;
  endSlotIndex: number;
  isOverflowLeft: boolean;
  isOverflowRight: boolean;
};

export type HouseboatModelPriceRecord = {
  id: string;
  model_id: string;
  tariff_id: string;
  weekday_price: number;
  weekend_price: number;
};

export type TariffRecord = {
  id: string;
  name: string;
  periods?: Array<{ start: string; end: string }>;
};

export type HouseboatReservationsState = {
  houseboatModels: HouseboatModel[];
  boats: Boat[];
  bookings: MappedBooking[];
  prices: HouseboatModelPriceRecord[];
  tariffs: TariffRecord[];
  availableExtras: any[];
  isLoading: boolean;
};
