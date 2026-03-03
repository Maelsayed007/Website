import type { DateRange } from 'react-day-picker';

export type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  source: string;
  houseboat_id?: string;
  restaurant_table_id?: string;
  daily_travel_id?: string;
  daily_travel_package_id?: string;
  daily_boat_id?: string;
  booking_type?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  extras?: string[];
  discount?: number;
  initial_payment_amount?: number;
  amount_paid?: number;
  billing_name?: string;
  billing_nif?: string;
  billing_address?: string;
  payment_status?: 'unpaid' | 'deposit_paid' | 'fully_paid' | 'failed' | null;
};

export type Transaction = {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  reference?: string;
  display_method?: string;
  source_table?: string;
  type?: string;
  billing_name?: string;
  billing_nif?: string;
  billing_address?: string;
  needs_invoice?: boolean;
};

export type Extra = {
  id: string;
  name: string;
  description?: string;
  price: number;
  price_type: 'per_stay' | 'per_day' | 'per_person';
  type?: string;
};

export type Boat = {
  id: string;
  name: string;
  modelId?: string;
  model_id?: string;
};

export type Price = {
  modelId?: string;
  model_id?: string;
  weekday: number;
  weekend: number;
};

export type PricingBreakdown = {
  weekdayNights: number;
  weekendNights: number;
  weekdayPrice: number;
  weekendPrice: number;
  rentalTotal: number;
  extrasTotal: number;
  preparationFee: number;
  discountAmount: number;
  total: number;
  deposit: number;
  balanceDue: number;
};

export type ReservationSortKey = keyof Booking | 'type';

export type ReservationSortConfig = {
  key: ReservationSortKey;
  direction: 'asc' | 'desc';
} | null;

export type ReservationQueryState = {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  boat: string;
  service: string;
  paymentStatus: string;
  dateRange?: DateRange;
  sortConfig: ReservationSortConfig;
  activeTab: 'all' | 'ar';
};

export const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Maintenance'];

export const statusColors: Record<string, string> = {
  Pending: 'bg-muted text-foreground',
  Contacted: 'bg-primary/15 text-primary',
  Confirmed: 'bg-primary text-primary-foreground',
  CheckIn: 'bg-secondary text-secondary-foreground',
  Completed: 'bg-muted text-foreground',
  Cancelled: 'bg-destructive/15 text-destructive',
  Maintenance: 'bg-muted text-muted-foreground',
};

