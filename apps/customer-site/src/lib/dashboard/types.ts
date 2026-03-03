import type { ElementType } from 'react';

export type DashboardBooking = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  source: string | null;
  total_price: number | null;
  amount_paid: number | null;
  houseboat_id: string | null;
  restaurant_table_id: string | null;
  daily_travel_package_id: string | null;
  number_of_guests: number | null;
  selected_extras: string[] | null;
};

export type DashboardSummary = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
};

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ElementType;
  exact?: boolean;
  permission: string;
};

export type DashboardViewState = 'loading' | 'ready' | 'empty' | 'error';

export type ReservationRow = {
  id: string;
  clientName: string;
  service: 'houseboat' | 'restaurant' | 'river-cruise' | 'other';
  startTime: string;
  endTime?: string | null;
  status: string;
  amount?: number | null;
  paymentStatus?: string | null;
};

export type ReservationFilters = {
  search: string;
  status: string;
  service?: string;
  from?: string;
  to?: string;
};

