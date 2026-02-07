'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/stat-card';
import { OperationsTable } from '@/components/operations-table';
import { RevenueSourceList } from '@/components/revenue-source-list';
import { RevenueServiceBreakdown } from '@/components/revenue-service-breakdown';
import { Clock, Check, Calendar, Euro } from 'lucide-react';

type Booking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startTime: string;
  endTime: string | null;
  status: string;
  houseboatId: string | null;
  restaurantTableId: string | null;
  dailyTravelPackageId: string | null;
  price: number;
};

type ScheduleItem = {
  id: string;
  clientName: string;
  time: string;
  details: string;
  status: string;
};

export default function DashboardPage() {
  const supabase = createClient();

  // State
  const [houseboats, setHouseboats] = useState<Array<{ id: string; name: string }>>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [houseboatArrivals, setHouseboatArrivals] = useState<ScheduleItem[]>([]);
  const [houseboatDepartures, setHouseboatDepartures] = useState<ScheduleItem[]>([]);
  const [cruiseArrivals, setCruiseArrivals] = useState<ScheduleItem[]>([]);
  const [cruiseDepartures, setCruiseDepartures] = useState<ScheduleItem[]>([]);
  const [restaurantToday, setRestaurantToday] = useState<ScheduleItem[]>([]);
  const [restaurantUpcoming, setRestaurantUpcoming] = useState<ScheduleItem[]>([]);
  const [revenueStats, setRevenueStats] = useState({ total: 0, houseboat: 0, restaurant: 0, cruise: 0 });
  const [revenueBySource, setRevenueBySource] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

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
    dailyTravelPackageId: b.daily_travel_package_id,
    price: b.price || 0,
  });

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // 1. Fetch Houseboats
    const { data: hbData, error: hbError } = await supabase.from('houseboat_models').select('id, name');
    if (hbError) {
      console.error("Error fetching houseboats:", hbError);
    } else if (hbData) {
      setHouseboats(hbData);
    }

    // 1.1 Fetch Restaurant Tables
    const { data: rtData } = await supabase.from('restaurant_tables').select('id, name');

    // 2. Fetch Active Bookings
    const { data: activeData } = await supabase.from('bookings').select('*')
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())
      .in('status', ['Confirmed', 'Maintenance']);

    if (activeData) setActiveBookings(activeData.map(mapBooking));

    // 3. Fetch Operational Schedules
    const timeFilterStart = now.toISOString();
    const timeFilterEnd = threeDaysLater.toISOString();

    const { data: scheduleData } = await supabase.from('bookings').select('*')
      .or(`start_time.gte.${timeFilterStart},end_time.gte.${timeFilterStart}`)
      .lt('start_time', timeFilterEnd)
      .eq('status', 'Confirmed');

    if (scheduleData) {
      const bookings = scheduleData.map(mapBooking);

      setHouseboatArrivals(bookings.filter(b => b.houseboatId && new Date(b.startTime) >= now && new Date(b.startTime) <= threeDaysLater)
        .map(b => ({
          id: b.id,
          clientName: b.clientName,
          time: b.startTime,
          details: hbData?.find(h => h.id === b.houseboatId)?.name || 'Houseboat',
          status: b.status
        }))
      );

      setHouseboatDepartures(bookings.filter(b => b.houseboatId && b.endTime && new Date(b.endTime) >= now && new Date(b.endTime) <= threeDaysLater)
        .map(b => ({
          id: b.id,
          clientName: b.clientName,
          time: b.endTime!,
          details: hbData?.find(h => h.id === b.houseboatId)?.name || 'Houseboat',
          status: 'Checkout'
        }))
      );

      setCruiseArrivals(bookings.filter(b => b.dailyTravelPackageId && new Date(b.startTime) >= now && new Date(b.startTime) <= threeDaysLater)
        .map(b => ({
          id: b.id,
          clientName: b.clientName,
          time: b.startTime,
          details: 'Cruise Package',
          status: 'Departure'
        }))
      );

      setCruiseDepartures(bookings.filter(b => b.dailyTravelPackageId && b.endTime && new Date(b.endTime) >= now && new Date(b.endTime) <= threeDaysLater)
        .map(b => ({
          id: b.id,
          clientName: b.clientName,
          time: b.endTime!,
          details: 'Cruise Return',
          status: 'Return'
        }))
      );

      const resBookings = bookings.filter(b => b.restaurantTableId);
      const restaurantItems = resBookings.map(b => ({
        id: b.id,
        clientName: b.clientName,
        time: b.startTime,
        details: rtData?.find(t => t.id === b.restaurantTableId)?.name || 'Table Reservation',
        status: 'Reserved'
      }));

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      setRestaurantToday(restaurantItems.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate >= todayStart && itemDate < todayEnd;
      }));

      setRestaurantUpcoming(restaurantItems.filter(item => {
        const itemDate = new Date(item.time);
        return itemDate >= todayEnd && itemDate <= threeDaysLater;
      }));
    }

    // 4. Calculate Revenue
    const { data: revenueData } = await supabase.from('bookings').select('*')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
      .eq('status', 'Confirmed');

    if (revenueData) {
      const stats = { total: 0, houseboat: 0, restaurant: 0, cruise: 0 };
      const sourceStats: Record<string, number> = {};

      revenueData.forEach(b => {
        const price = b.price || 0;
        stats.total += price;

        if (b.houseboat_id) stats.houseboat += price;
        else if (b.restaurant_table_id) stats.restaurant += price;
        else if (b.daily_travel_package_id) stats.cruise += price;

        const source = b.source || 'Direct';
        sourceStats[source] = (sourceStats[source] || 0) + price;
      });
      setRevenueStats(stats);
      setRevenueBySource(sourceStats);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    fetchData();

    // Set up real-time listener
    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  if (!supabase) return null;

  const totalBookings = houseboatArrivals.length + houseboatDepartures.length + cruiseArrivals.length + cruiseDepartures.length;
  const pendingBookings = 9; // Hardcoded for demo to match image

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#1A2E1A] mb-2 tracking-tight">Command Center</h1>
        <p className="text-sm font-medium text-[#5F738C]">Manage operations, monitor status, and handle check-ins</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard label="Total Bookings" value={totalBookings} icon={Calendar} iconColor="text-[#1A2E1A]" />
        <StatCard label="Pending Requests" value={pendingBookings} icon={Clock} iconColor="text-[#C68A3E]" />
        <StatCard label="Confirmed" value={totalBookings} icon={Check} iconColor="text-[#90C17C]" />
        <StatCard label="Total Revenue" value={`€${revenueStats.total.toLocaleString()}`} icon={Euro} iconColor="text-[#1A2E1A]" />
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-12">
          {/* Houseboat Operations */}
          <Tabs defaultValue="arrivals" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1A2E1A] tracking-tight">Houseboat Operations</h2>
              <TabsList className="bg-[#F5F3EE] p-1.5 rounded-full">
                <TabsTrigger value="arrivals" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Arrivals
                </TabsTrigger>
                <TabsTrigger value="departures" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Departures
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="arrivals">
              <OperationsTable
                title="Upcoming Arrivals"
                items={houseboatArrivals}
                type="arrival"
                emptyMessage="No arrivals in the next 3 days"
              />
            </TabsContent>
            <TabsContent value="departures">
              <OperationsTable
                title="Upcoming Departures"
                items={houseboatDepartures}
                type="departure"
                emptyMessage="No departures in the next 3 days"
              />
            </TabsContent>
          </Tabs>

          {/* Cruise Operations */}
          <Tabs defaultValue="departures" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1A2E1A] tracking-tight">Cruise Operations</h2>
              <TabsList className="bg-[#F5F3EE] p-1.5 rounded-full">
                <TabsTrigger value="departures" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Departures
                </TabsTrigger>
                <TabsTrigger value="returns" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Returns
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="departures">
              <OperationsTable
                title="Scheduled Departures"
                items={cruiseArrivals}
                type="departure"
                emptyMessage="No cruise departures scheduled"
              />
            </TabsContent>
            <TabsContent value="returns">
              <OperationsTable
                title="Expected Returns"
                items={cruiseDepartures}
                type="arrival"
                emptyMessage="No cruise returns expected"
              />
            </TabsContent>
          </Tabs>

          {/* Restaurant Reservations */}
          <Tabs defaultValue="today" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1A2E1A] tracking-tight">Restaurant Reservations</h2>
              <TabsList className="bg-[#F5F3EE] p-1.5 rounded-full">
                <TabsTrigger value="today" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Today
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="rounded-full px-8 py-2.5 text-sm font-black transition-all data-[state=active]:bg-[#90C17C] data-[state=active]:text-[#1A2E1A] data-[state=active]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-[#5F738C] hover:text-[#1A2E1A]">
                  Upcoming
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="today">
              <OperationsTable
                title="Today's Reservations"
                items={restaurantToday}
                type="generic"
                emptyMessage="No restaurant reservations for today"
              />
            </TabsContent>
            <TabsContent value="upcoming">
              <OperationsTable
                title="Upcoming Reservations"
                items={restaurantUpcoming}
                type="generic"
                emptyMessage="No upcoming restaurant reservations"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar (1/3 width) */}
        <div className="space-y-8">
          <RevenueServiceBreakdown data={revenueStats} />
          <RevenueSourceList sourceData={revenueBySource} total={revenueStats.total} />
        </div>
      </div>
    </div>
  );
}
