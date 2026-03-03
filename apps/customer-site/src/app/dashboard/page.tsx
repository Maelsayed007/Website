'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperationsTable } from '@/components/operations-table';
import {
  DashboardEmptyState,
  DashboardPageHeader,
  DashboardStatCard,
  DashboardStatusBadge,
} from '@/components/dashboard';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Ship,
  Utensils,
  Waves,
  Users,
} from 'lucide-react';

type Booking = {
  id: string;
  clientName: string;
  startTime: string;
  endTime: string | null;
  status: string;
  houseboatId: string | null;
  restaurantTableId: string | null;
  riverCruisePackageId: string | null;
};

type ScheduleItem = {
  id: string;
  clientName: string;
  time: string;
  details: string;
  status: string;
};

type PendingRequest = {
  id: string;
  clientName: string;
  startTime: string;
  serviceLabel: string;
  targetPath: string;
};

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  tone: 'info' | 'pending' | 'confirmed';
};

type HouseboatMeta = { id: string; name: string };
type RestaurantTableMeta = { id: string; name: string };

const tabTriggerClasses =
  'rounded-full px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground';

function toBooking(row: any): Booking {
  return {
    id: String(row.id),
    clientName: String(row.client_name || 'Guest'),
    startTime: String(row.start_time),
    endTime: row.end_time ? String(row.end_time) : null,
    status: String(row.status || ''),
    houseboatId: row.houseboat_id ? String(row.houseboat_id) : null,
    restaurantTableId: row.restaurant_table_id ? String(row.restaurant_table_id) : null,
    riverCruisePackageId: row.daily_travel_package_id ? String(row.daily_travel_package_id) : null,
  };
}

function getPendingTarget(booking: Booking): { serviceLabel: string; targetPath: string } {
  if (booking.houseboatId) {
    return {
      serviceLabel: 'Houseboat',
      targetPath: `/dashboard/houseboat-reservations?highlight=${booking.id}`,
    };
  }
  if (booking.restaurantTableId) {
    return {
      serviceLabel: 'Restaurant',
      targetPath: `/dashboard/restaurant-reservations?highlight=${booking.id}`,
    };
  }
  if (booking.riverCruisePackageId) {
    return {
      serviceLabel: 'River Cruise',
      targetPath: `/dashboard/river-cruise-reservations?highlight=${booking.id}`,
    };
  }
  return {
    serviceLabel: 'General',
    targetPath: `/dashboard/reservations?highlight=${booking.id}`,
  };
}

function isOnSameDay(dateValue: string, day: Date) {
  const date = new Date(dateValue);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function formatTimeValue(dateValue: string) {
  try {
    return format(new Date(dateValue), 'HH:mm');
  } catch {
    return '--:--';
  }
}

export default function DashboardPage() {
  const supabase = createClient();

  const [houseboatArrivals, setHouseboatArrivals] = useState<ScheduleItem[]>([]);
  const [houseboatDepartures, setHouseboatDepartures] = useState<ScheduleItem[]>([]);
  const [cruiseArrivals, setCruiseArrivals] = useState<ScheduleItem[]>([]);
  const [cruiseDepartures, setCruiseDepartures] = useState<ScheduleItem[]>([]);
  const [restaurantToday, setRestaurantToday] = useState<ScheduleItem[]>([]);
  const [restaurantUpcoming, setRestaurantUpcoming] = useState<ScheduleItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const fetchData = useCallback(async () => {
    if (!supabase) return;

    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    const [hbRes, rtRes, scheduleRes, pendingRes] = await Promise.all([
      supabase.from('houseboat_models').select('id, name'),
      supabase.from('restaurant_tables').select('id, name'),
      supabase
        .from('bookings')
        .select('*')
        .or(`start_time.gte.${now.toISOString()},end_time.gte.${now.toISOString()}`)
        .lt('start_time', threeDaysLater.toISOString())
        .eq('status', 'Confirmed'),
      supabase
        .from('bookings')
        .select('*')
        .eq('status', 'Pending')
        .order('start_time', { ascending: true })
        .limit(12),
    ]);

    const hbData = (hbRes.data ?? []) as HouseboatMeta[];
    const rtData = (rtRes.data ?? []) as RestaurantTableMeta[];

    if (scheduleRes.data) {
      const bookings: Booking[] = scheduleRes.data.map(toBooking);

      setHouseboatArrivals(
        bookings
          .filter(
            (booking) =>
              booking.houseboatId &&
              new Date(booking.startTime) >= now &&
              new Date(booking.startTime) <= threeDaysLater
          )
          .map((booking) => ({
            id: booking.id,
            clientName: booking.clientName,
            time: booking.startTime,
            details: hbData.find((item) => item.id === booking.houseboatId)?.name || 'Houseboat',
            status: booking.status,
          }))
      );

      setHouseboatDepartures(
        bookings
          .filter(
            (booking) =>
              booking.houseboatId &&
              booking.endTime &&
              new Date(booking.endTime) >= now &&
              new Date(booking.endTime) <= threeDaysLater
          )
          .map((booking) => ({
            id: booking.id,
            clientName: booking.clientName,
            time: booking.endTime as string,
            details: hbData.find((item) => item.id === booking.houseboatId)?.name || 'Houseboat',
            status: 'Checkout',
          }))
      );

      setCruiseArrivals(
        bookings
          .filter(
            (booking) =>
              booking.riverCruisePackageId &&
              new Date(booking.startTime) >= now &&
              new Date(booking.startTime) <= threeDaysLater
          )
          .map((booking) => ({
            id: booking.id,
            clientName: booking.clientName,
            time: booking.startTime,
            details: 'Cruise Package',
            status: 'Departure',
          }))
      );

      setCruiseDepartures(
        bookings
          .filter(
            (booking) =>
              booking.riverCruisePackageId &&
              booking.endTime &&
              new Date(booking.endTime) >= now &&
              new Date(booking.endTime) <= threeDaysLater
          )
          .map((booking) => ({
            id: booking.id,
            clientName: booking.clientName,
            time: booking.endTime as string,
            details: 'Cruise Return',
            status: 'Return',
          }))
      );

      const restaurantItems = bookings
        .filter((booking) => booking.restaurantTableId)
        .map((booking) => ({
          id: booking.id,
          clientName: booking.clientName,
          time: booking.startTime,
          details:
            rtData.find((item) => item.id === booking.restaurantTableId)?.name || 'Table Reservation',
          status: 'Reserved',
        }));

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      setRestaurantToday(
        restaurantItems.filter((item) => {
          const itemDate = new Date(item.time);
          return itemDate >= todayStart && itemDate < todayEnd;
        })
      );

      setRestaurantUpcoming(
        restaurantItems.filter((item) => {
          const itemDate = new Date(item.time);
          return itemDate >= todayEnd && itemDate <= threeDaysLater;
        })
      );
    }

    if (pendingRes.data) {
      const nextPending = pendingRes.data.map(toBooking).map((booking: Booking) => {
        const target = getPendingTarget(booking);
        return {
          id: booking.id,
          clientName: booking.clientName,
          startTime: booking.startTime,
          serviceLabel: target.serviceLabel,
          targetPath: target.targetPath,
        } satisfies PendingRequest;
      });
      setPendingRequests(nextPending);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    fetchData();

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  const today = useMemo(() => new Date(), []);
  const checkInsToday = houseboatArrivals.filter((item) => isOnSameDay(item.time, today)).length;
  const checkOutsToday = houseboatDepartures.filter((item) => isOnSameDay(item.time, today)).length;
  const cruiseDeparturesToday = cruiseArrivals.filter((item) => isOnSameDay(item.time, today)).length;

  const operations72h =
    houseboatArrivals.length +
    houseboatDepartures.length +
    cruiseArrivals.length +
    cruiseDepartures.length +
    restaurantToday.length +
    restaurantUpcoming.length;

  const timelineToday = useMemo(() => {
    const items: TimelineItem[] = [
      ...houseboatArrivals
        .filter((item) => isOnSameDay(item.time, today))
        .map((item) => ({
          id: `hb-arrival-${item.id}`,
          time: item.time,
          title: item.clientName,
          subtitle: `Check-in - ${item.details}`,
          tone: 'info' as const,
        })),
      ...houseboatDepartures
        .filter((item) => isOnSameDay(item.time, today))
        .map((item) => ({
          id: `hb-departure-${item.id}`,
          time: item.time,
          title: item.clientName,
          subtitle: `Check-out - ${item.details}`,
          tone: 'info' as const,
        })),
      ...restaurantToday.map((item) => ({
        id: `restaurant-${item.id}`,
        time: item.time,
        title: item.clientName,
        subtitle: `Restaurant - ${item.details}`,
        tone: 'confirmed' as const,
      })),
      ...cruiseArrivals
        .filter((item) => isOnSameDay(item.time, today))
        .map((item) => ({
          id: `cruise-departure-${item.id}`,
          time: item.time,
          title: item.clientName,
          subtitle: item.details,
          tone: 'pending' as const,
        })),
      ...cruiseDepartures
        .filter((item) => isOnSameDay(item.time, today))
        .map((item) => ({
          id: `cruise-return-${item.id}`,
          time: item.time,
          title: item.clientName,
          subtitle: item.details,
          tone: 'info' as const,
        })),
    ];

    return items
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 12);
  }, [houseboatArrivals, houseboatDepartures, restaurantToday, cruiseArrivals, cruiseDepartures, today]);

  const serviceBoards = [
    {
      id: 'houseboats',
      title: 'Houseboats',
      description: 'Arrivals and departures',
      value: houseboatArrivals.length + houseboatDepartures.length,
      next: [...houseboatArrivals, ...houseboatDepartures].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      )[0],
      href: '/dashboard/houseboat-reservations',
    },
    {
      id: 'restaurant',
      title: 'Restaurant',
      description: 'Today and upcoming seatings',
      value: restaurantToday.length + restaurantUpcoming.length,
      next: [...restaurantToday, ...restaurantUpcoming].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      )[0],
      href: '/dashboard/restaurant-reservations',
    },
    {
      id: 'cruise',
      title: 'River Cruise',
      description: 'Departures and returns',
      value: cruiseArrivals.length + cruiseDepartures.length,
      next: [...cruiseArrivals, ...cruiseDepartures].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      )[0],
      href: '/dashboard/river-cruise-reservations',
    },
  ];

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        title="Operations Command Center"
        description="Track pending requests, today's schedule, and next 72-hour workload."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/reservations"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Open Reservations Hub
            </Link>
            <Link
              href="/dashboard/houseboat-reservations?action=new"
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground"
            >
              New Houseboat Booking
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardStatCard label="Pending Requests" value={pendingRequests.length} icon={Clock3} tone="warning" />
        <DashboardStatCard label="Check-ins Today" value={checkInsToday} icon={Ship} />
        <DashboardStatCard label="Check-outs Today" value={checkOutsToday} icon={Calendar} />
        <DashboardStatCard label="Restaurant Today" value={restaurantToday.length} icon={Utensils} />
        <DashboardStatCard label="Cruise Departures" value={cruiseDeparturesToday} icon={Waves} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Action Queue
            </h2>
            <Link href="/dashboard/reservations" className="text-xs font-semibold text-primary hover:underline">
              View all pending
            </Link>
          </div>

          {pendingRequests.length === 0 ? (
            <DashboardEmptyState
              title="No pending requests"
              description="All current requests are already processed."
              icon={CheckCircle2}
            />
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <Link
                  key={request.id}
                  href={request.targetPath}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{request.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.serviceLabel} - {format(new Date(request.startTime), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <DashboardStatusBadge tone="pending">Pending</DashboardStatusBadge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Today Timeline
            </h2>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{timelineToday.length} events</span>
            </div>
          </div>

          {timelineToday.length === 0 ? (
            <DashboardEmptyState
              title="No events scheduled today"
              description="The operation timeline will populate as bookings are confirmed."
              icon={Calendar}
            />
          ) : (
            <div className="space-y-2">
              {timelineToday.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{formatTimeValue(item.time)}</span>
                    <DashboardStatusBadge tone={item.tone}>
                      {item.tone === 'pending' ? 'Upcoming' : item.tone === 'confirmed' ? 'Seating' : 'Scheduled'}
                    </DashboardStatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Service Boards
          </h2>
          <span className="text-xs text-muted-foreground">{operations72h} operations in next 72h</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {serviceBoards.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{service.title}</p>
                <p className="text-2xl font-bold text-foreground">{service.value}</p>
              </div>
              <p className="text-xs text-muted-foreground">{service.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {service.next ? `Next: ${format(new Date(service.next.time), 'MMM dd, HH:mm')}` : 'No upcoming events'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <Tabs defaultValue="houseboats" className="w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Operations Schedule (72h)</h2>
            <TabsList className="rounded-full bg-muted p-1">
              <TabsTrigger value="houseboats" className={tabTriggerClasses}>
                Houseboats
              </TabsTrigger>
              <TabsTrigger value="restaurant" className={tabTriggerClasses}>
                Restaurant
              </TabsTrigger>
              <TabsTrigger value="cruise" className={tabTriggerClasses}>
                River Cruise
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="houseboats" className="mt-0">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <OperationsTable
                title="Upcoming Arrivals"
                items={houseboatArrivals}
                type="arrival"
                emptyMessage="No arrivals in the next 3 days"
              />
              <OperationsTable
                title="Upcoming Departures"
                items={houseboatDepartures}
                type="departure"
                emptyMessage="No departures in the next 3 days"
              />
            </div>
          </TabsContent>

          <TabsContent value="restaurant" className="mt-0">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <OperationsTable
                title="Today Reservations"
                items={restaurantToday}
                type="generic"
                emptyMessage="No restaurant reservations for today"
              />
              <OperationsTable
                title="Upcoming Reservations"
                items={restaurantUpcoming}
                type="generic"
                emptyMessage="No upcoming restaurant reservations"
              />
            </div>
          </TabsContent>

          <TabsContent value="cruise" className="mt-0">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <OperationsTable
                title="Scheduled Departures"
                items={cruiseArrivals}
                type="departure"
                emptyMessage="No cruise departures scheduled"
              />
              <OperationsTable
                title="Expected Returns"
                items={cruiseDepartures}
                type="arrival"
                emptyMessage="No cruise returns expected"
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
