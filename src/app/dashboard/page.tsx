'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Ship, Utensils, Calendar as CalendarIcon, Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { KPICard } from '@/components/dashboard-kpi-card';
import { ActivityCard } from '@/components/dashboard-activity-card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

type Client = {
  id: string;
  created_at: string;
}

type Booking = {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  startTime: string;
  endTime?: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Maintenance';
  houseboatId?: string;
  restaurantTableId?: string;
  dailyTravelPackageId?: string;
}

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const getKPIs = (bookings: Booking[] | null) => ({
  houseboat: bookings?.filter(b => b.houseboatId).length || 0,
  restaurant: bookings?.filter(b => b.restaurantTableId).length || 0,
  daily: bookings?.filter(b => b.dailyTravelPackageId).length || 0,
});

const getBookingType = (booking: Booking): 'houseboat' | 'restaurant' | 'dailyTravel' => {
  if (booking.houseboatId) return 'houseboat';
  if (booking.restaurantTableId) return 'restaurant';
  return 'dailyTravel';
};

const getBookingIcon = (booking: Booking) => {
  if (booking.houseboatId) return Ship;
  if (booking.restaurantTableId) return Utensils;
  return CalendarIcon;
};

const getBookingDetails = (booking: Booking) => {
  const start = format(new Date(booking.startTime), 'MMM dd, yyyy');
  if (booking.endTime) {
    const end = format(new Date(booking.endTime), 'MMM dd');
    return `${start} - ${end}`;
  }
  return start;
};

const getBookingHref = (booking: Booking) => {
  if (booking.houseboatId) return `/dashboard/houseboat-reservations?highlight=${booking.id}`;
  if (booking.restaurantTableId) return '/dashboard/restaurant-reservations';
  return '/dashboard/daily-travel-reservations';
};

export default function DashboardPage() {
  const { supabase } = useSupabase();
  const [thisMonthBookings, setThisMonthBookings] = useState<Booking[]>([]);
  const [lastMonthBookings, setLastMonthBookings] = useState<Booking[]>([]);
  const [thisMonthClients, setThisMonthClients] = useState<Client[]>([]);
  const [lastMonthClients, setLastMonthClients] = useState<Client[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfLastMonth = lastMonth.toISOString();
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // 1. Fetch Bookings for This Month
      const { data: thisMonthData } = await supabase.from('bookings').select('*')
        .gte('start_time', startOfThisMonth)
        .lte('start_time', endOfThisMonth);

      // 2. Fetch Bookings for Last Month
      const { data: lastMonthData } = await supabase.from('bookings').select('*')
        .gte('start_time', startOfLastMonth)
        .lte('start_time', endOfLastMonth);

      // 3. Fetch Clients for This Month
      const { data: thisMonthClientsData } = await supabase.from('clients').select('*')
        .gte('created_at', startOfThisMonth)
        .lte('created_at', endOfThisMonth);

      // 4. Fetch Clients for Last Month
      const { data: lastMonthClientsData } = await supabase.from('clients').select('*')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth);

      // 5. Fetch Upcoming Arrivals
      const { data: upcomingData } = await supabase.from('bookings').select('*')
        .gte('start_time', now.toISOString())
        .eq('status', 'Confirmed')
        .order('start_time', { ascending: true })
        .limit(10);


      // Mappers
      const mapBooking = (b: any): Booking => ({
        id: b.id,
        clientName: b.client_name,
        clientEmail: b.client_email,
        clientPhone: b.client_phone,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        houseboatId: b.houseboat_id,
        restaurantTableId: b.restaurant_table_id,
        dailyTravelPackageId: b.daily_travel_package_id, // Assuming snake_case column
      });

      if (thisMonthData) setThisMonthBookings(thisMonthData.map(mapBooking));
      if (lastMonthData) setLastMonthBookings(lastMonthData.map(mapBooking));
      if (thisMonthClientsData) setThisMonthClients(thisMonthClientsData as Client[]);
      if (lastMonthClientsData) setLastMonthClients(lastMonthClientsData as Client[]);
      if (upcomingData) setUpcomingArrivals(upcomingData.map(mapBooking));

      setIsLoading(false);
    };

    fetchData();
  }, [supabase]);


  const thisMonthKPIs = getKPIs(thisMonthBookings);
  const lastMonthKPIs = getKPIs(lastMonthBookings);

  const houseboatChange = calculateChange(thisMonthKPIs.houseboat, lastMonthKPIs.houseboat);
  const restaurantChange = calculateChange(thisMonthKPIs.restaurant, lastMonthKPIs.restaurant);
  const dailyChange = calculateChange(thisMonthKPIs.daily, lastMonthKPIs.daily);
  const clientChange = calculateChange(thisMonthClients?.length || 0, lastMonthClients?.length || 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={format(new Date(), 'EEEE, MMMM dd, yyyy')}
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <KPICard
          title="Houseboat Bookings"
          value={thisMonthKPIs.houseboat}
          change={houseboatChange}
          icon={Ship}
          isLoading={isLoading}
          subtitle="This month"
        />
        <KPICard
          title="Restaurant Reservations"
          value={thisMonthKPIs.restaurant}
          change={restaurantChange}
          icon={Utensils}
          isLoading={isLoading}
          subtitle="This month"
        />
        <KPICard
          title="Daily Travel Bookings"
          value={thisMonthKPIs.daily}
          change={dailyChange}
          icon={CalendarIcon}
          isLoading={isLoading}
          subtitle="This month"
        />
        <KPICard
          title="New Clients"
          value={thisMonthClients?.length || 0}
          change={clientChange}
          icon={Users}
          isLoading={isLoading}
          subtitle="This month"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Latest bookings and updates</p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            ) : thisMonthBookings && thisMonthBookings.length > 0 ? (
              thisMonthBookings.slice(0, 5).map(booking => (
                <ActivityCard
                  key={booking.id}
                  id={booking.id}
                  icon={getBookingIcon(booking)}
                  clientName={booking.clientName}
                  details={getBookingDetails(booking)}
                  timestamp={new Date(booking.startTime)}
                  status={booking.status as 'Pending' | 'Confirmed' | 'Cancelled'}
                  href={getBookingHref(booking)}
                  type={getBookingType(booking)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20">
                <EmptyState
                  icon={TrendingUp}
                  title="No recent activity"
                  description="New bookings will appear here"
                />
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Arrivals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Upcoming Arrivals</h2>
              <p className="text-sm text-muted-foreground">Confirmed bookings coming soon</p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            ) : upcomingArrivals && upcomingArrivals.length > 0 ? (
              upcomingArrivals.slice(0, 5).map(booking => (
                <ActivityCard
                  key={booking.id}
                  id={booking.id}
                  icon={getBookingIcon(booking)}
                  clientName={booking.clientName}
                  details={getBookingDetails(booking)}
                  timestamp={new Date(booking.startTime)}
                  status={booking.status as 'Pending' | 'Confirmed' | 'Cancelled'}
                  href={getBookingHref(booking)}
                  type={getBookingType(booking)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20">
                <EmptyState
                  icon={CalendarIcon}
                  title="No upcoming arrivals"
                  description="Confirmed bookings will appear here"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
