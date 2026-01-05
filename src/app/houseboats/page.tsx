'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSupabase } from '@/components/providers/supabase-provider';
import HouseboatSearchCard from '@/components/houseboat-search-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, differenceInDays, eachDayOfInterval, isWithinInterval, addDays, getDay, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Users, SlidersHorizontal, Search, Check, Info, MapPin, Anchor, DollarSign, Bed, ArrowRight, X, Star, Utensils, Wifi, Droplets, CreditCard, BedDouble, Sofa } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// Types
type HouseboatModel = {
  id: string;
  name: string;
  slug: string;
  image_urls: string[];
  optimal_capacity: number;
  maximum_capacity: number;
  kitchens: number;
  bathrooms: number;
  bedrooms: number;
  description?: string;
  // Computed Price Props
  pricePerNight?: number;
  totalPrice?: number;
  breakdown?: {
    weekdayNights: number;
    weekdayPrice: number;
    weekendNights: number;
    weekendPrice: number;
    preparationFee: number;
    total: number;
    deposit: number;
  };
  isAvailable?: boolean;
  imageUrls?: string[];
  optimalCapacity?: number;
  maximumCapacity?: number;
  // Missing properties to satisfy strict types
  singleBeds?: number;
  doubleBeds?: number;
  amenities?: string[];
  images?: string[];
  licenseRequired?: boolean;
};

type HouseboatPrice = {
  model_id: string;
  weekday_price: number;
  weekend_price: number;
}

type Booking = {
  id: string;
  houseboat_id: string;
  start_time: string;
  end_time: string;
  status: string;
};

function HouseboatsContent() {
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const guestsParam = searchParams.get('guests');
  const isSearchMode = !!(fromParam && toParam);

  // States
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (fromParam && toParam) {
      try {
        return { from: parseISO(fromParam), to: parseISO(toParam) };
      } catch (e) { return undefined; }
    }
    return undefined;
  });
  const [guests, setGuests] = useState(guestsParam || '2');
  const [selectedBoat, setSelectedBoat] = useState<HouseboatModel | null>(null);

  // Data
  const [houseboats, setHouseboats] = useState<HouseboatModel[]>([]);
  const [prices, setPrices] = useState<HouseboatPrice[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [modelsRes, pricesRes] = await Promise.all([
        supabase.from('houseboat_models').select('*'),
        supabase.from('houseboat_prices').select('*')
      ]);

      if (modelsRes.data) setHouseboats(modelsRes.data as any);
      if (pricesRes.data) setPrices(pricesRes.data as any);

      if (isSearchMode) {
        const { data: bookings } = await supabase.from('bookings').select('*').gte('end_time', new Date().toISOString());
        if (bookings) setAllBookings(bookings as any);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [supabase, isSearchMode]);

  // Process & Sort Boats
  const processedHouseboats = useMemo(() => {
    if (!houseboats.length) return [];

    const guestCount = parseInt(guests) || 2;
    // Calculate nights array
    let bookingNights: Date[] = [];
    if (isSearchMode && dateRange?.from && dateRange?.to) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      // Remove the last day (checkout day) to get nights
      bookingNights = days.slice(0, -1);
    }

    return houseboats.map(boat => {
      const modelPrices = prices.filter(p => p.model_id === boat.id);
      const priceObj = modelPrices[0] || { weekday_price: 150, weekend_price: 150 };

      // Basic Availability & Capacity
      let isAvailable = true;
      if (isSearchMode) {
        if (guestCount > (boat.maximum_capacity || 6)) isAvailable = false;

        // Date Check
        if (isAvailable && dateRange?.from && dateRange?.to) {
          const requestedInterval = { start: dateRange.from, end: dateRange.to };
          const boatBookings = allBookings.filter(b => b.houseboat_id === boat.id && ['Confirmed', 'Pending'].includes(b.status));
          const hasConflict = boatBookings.some(b => {
            const start = parseISO(b.start_time);
            const end = parseISO(b.end_time);
            // Check overlap
            return (
              isWithinInterval(requestedInterval.start, { start, end }) ||
              isWithinInterval(requestedInterval.end, { start, end }) ||
              isWithinInterval(start, { start: requestedInterval.start, end: requestedInterval.end })
            );
          });
          if (hasConflict) isAvailable = false;
        }
      }

      // Calculate Precise Pricing
      let breakdown = undefined;
      let total = 0;

      if (isSearchMode && bookingNights.length > 0) {
        let weekdayCount = 0;
        let weekendCount = 0;

        bookingNights.forEach(nightDate => {
          const day = getDay(nightDate); // 0=Sun, 1=Mon... 5=Fri, 6=Sat
          if (day === 5 || day === 6) {
            weekendCount++;
          } else {
            weekdayCount++;
          }
        });

        const weekdaysCost = weekdayCount * (priceObj.weekday_price || 0);
        const weekendsCost = weekendCount * (priceObj.weekend_price || 0);
        const preparationFee = 76;

        total = weekdaysCost + weekendsCost + preparationFee;

        breakdown = {
          weekdayNights: weekdayCount,
          weekdayPrice: priceObj.weekday_price || 0,
          weekendNights: weekendCount,
          weekendPrice: priceObj.weekend_price || 0,
          preparationFee,
          total,
          deposit: Math.ceil(total * 0.30)
        };
      }

      return {
        ...boat,
        optimalCapacity: boat.optimal_capacity || 4,
        maximumCapacity: boat.maximum_capacity || 6,
        imageUrls: boat.image_urls || [],
        pricePerNight: priceObj.weekday_price || 150,
        totalPrice: isSearchMode ? total : undefined,
        breakdown,
        isAvailable,
        // FIX: Use ID if slug is missing to prevent 404s
        slug: boat.slug || boat.id,
        singleBeds: 0,
        doubleBeds: boat.bedrooms, // Mocked for now
        amenities: [],
        images: boat.image_urls || [],
        licenseRequired: true,
      };
    })
      .filter(boat => !isSearchMode || boat.isAvailable)
      .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
  }, [houseboats, prices, allBookings, dateRange, guests, isSearchMode]);


  const handleSearch = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    const params = new URLSearchParams();
    params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    params.set('guests', guests);
    window.location.href = `/houseboats?${params.toString()}`;
  };

  const handleClear = () => window.location.href = '/houseboats';

  // Helper to determine bed configuration based on search
  const showConvertibleBed = useMemo(() => {
    if (!selectedBoat) return false;
    const guestCount = parseInt(guests) || 2;
    return guestCount > (selectedBoat.optimalCapacity || 0);
  }, [guests, selectedBoat]);

  // Generate Link with current params
  const getReserveLink = (boat: HouseboatModel) => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    params.set('guests', guests);

    return `/houseboats/${boat.slug}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-white">

      {/* HORIZONTAL FILTER BAR - Sticky Top */}
      <div className="sticky top-16 md:top-20 z-40 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">

            {/* Title / Count */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-[#202124] flex items-center gap-2">
                Available Boats
                <span className="text-gray-500 text-sm font-normal">({processedHouseboats.length})</span>
              </h1>
            </div>

            {/* Filters - "Boxed" Style */}
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 no-scrollbar">

              {/* DATE PICKER COPY - Boxed */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg px-4 justify-start text-left font-medium min-w-[260px] shadow-sm transition-all", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-3 h-5 w-5 text-gray-500" />
                    <div className="flex flex-col items-start leading-none gap-0.5">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Dates</span>
                      <span className="text-sm font-semibold text-[#3c4043]">
                        {dateRange?.from ? (
                          dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "MMM dd")
                        ) : (
                          "Add dates"
                        )}
                      </span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white shadow-xl z-50 border border-gray-200 rounded-xl overflow-hidden" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
                    className="bg-white"
                  />
                </PopoverContent>
              </Popover>

              {/* GUESTS SELECT - Boxed */}
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg px-4 w-[160px] shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div className="flex flex-col items-start leading-none gap-0.5">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Guests</span>
                      <span className="text-sm font-semibold text-[#3c4043]">{guests} Guests</span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white z-50 rounded-xl border-gray-200 shadow-xl">
                  {[2, 4, 6, 8, 10, 12].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} Guests</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* UPDATE SEARCH BUTTON - Pill but Prominent */}
              <Button onClick={handleSearch} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all ml-2">
                Update
              </Button>

              {/* RESET - Desktop Only */}
              <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-red-500 hidden lg:flex rounded-full ml-auto" onClick={handleClear} title="Reset Filters">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Count Row */}
          <div className="lg:hidden mt-3 text-xs font-semibold text-gray-500">
            {processedHouseboats.length} boats available
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 min-h-[60vh]">

        {/* RESULTS GRID - 2 Columns */}
        <div className="w-full max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full rounded-2xl bg-gray-200" />)}
            </div>
          ) : processedHouseboats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
              {processedHouseboats.map(boat => (
                <HouseboatSearchCard
                  key={boat.id}
                  boat={boat as any}
                  onSelect={setSelectedBoat}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="bg-gray-50 p-4 rounded-full mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No boats found</h3>
              <p className="text-gray-500 mt-1 mb-4">Try adjusting your dates or guest count.</p>
              <Button variant="outline" onClick={handleClear}>Reset Filters</Button>
            </div>
          )}
        </div>
      </div>

      {/* SIDE PANEL (SHEET) */}
      <Sheet open={!!selectedBoat} onOpenChange={(open: boolean) => !open && setSelectedBoat(null)}>
        <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto p-0 bg-white z-[60] border-l border-gray-200 shadow-2xl [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Houseboat Details</SheetTitle>
            <SheetDescription>Detailed information and pricing for the selected houseboat.</SheetDescription>
          </SheetHeader>

          {selectedBoat && (
            <div className="flex flex-col min-h-full font-sans">

              {/* 1. HERO IMAGE */}
              <div className="relative h-60 w-full bg-gray-100 shrink-0">
                {selectedBoat.imageUrls?.[0] && (
                  <Image src={selectedBoat.imageUrls[0]} alt={selectedBoat.name} fill className="object-cover" />
                )}
                <Button size="icon" variant="secondary" className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white text-black shadow-md border border-gray-200 hover:scale-110 transition-transform" onClick={() => setSelectedBoat(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 2. MAIN CONTENT - Compact */}
              <div className="flex-1 px-6 py-6 space-y-6">

                {/* Headline */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-[#010a1f] tracking-tight">{selectedBoat.name}</h2>
                  <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100">
                      <Users className="w-4 h-4" /> {selectedBoat.optimalCapacity}-{selectedBoat.maximumCapacity} Guests
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      <BedDouble className="w-4 h-4" /> {selectedBoat.bedrooms} Cabins
                    </span>
                  </div>
                </div>

                <div className="h-px bg-gray-200 w-full" />

                {/* Description */}
                <div>
                  <p className="text-gray-700 leading-relaxed text-[15px] font-normal">
                    {selectedBoat.description || "Experience the freedom of navigating the Great Lake of Alqueva. This boat features modern amenities, a fully equipped kitchen, and a spacious sun deck perfect for relaxing afternoons."}
                  </p>
                </div>

                {/* SLEEPING ARRANGEMENTS - Dynamic */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Sleeping Arrangements</h3>
                  <div className="flex flex-col gap-3">
                    {/* Double Beds */}
                    {(selectedBoat.doubleBeds || 0) > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm shrink-0">
                          <BedDouble className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {selectedBoat.doubleBeds} {selectedBoat.doubleBeds! > 1 ? 'Double Beds' : 'Double Bed'}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Single Beds */}
                    {(selectedBoat.singleBeds || 0) > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm shrink-0">
                          <Bed className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {selectedBoat.singleBeds} {selectedBoat.singleBeds! > 1 ? 'Single Beds' : 'Single Bed'}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Convertible Living Room Bed */}
                    {showConvertibleBed && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-500">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm shrink-0">
                          <Sofa className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">Convertible Table Bed</span>
                          <span className="text-xs text-green-600 font-bold">Living Room</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Highlights */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-sm">
                      <Utensils className="w-3.5 h-3.5" /> Full Kitchen
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-sm">
                      <Wifi className="w-3.5 h-3.5" /> Free WiFi
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-sm">
                      <Droplets className="w-3.5 h-3.5" /> Private Bathroom
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-sm">
                      <MapPin className="w-3.5 h-3.5" /> GPS Navigation
                    </div>
                  </div>
                </div>

                {/* Pricing Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-4 h-4 text-[#010a1f]" />
                    <h3 className="text-sm font-bold text-[#010a1f] uppercase tracking-wider">Trip Summary</h3>
                  </div>

                  <div className="space-y-2">
                    {selectedBoat.breakdown ? (
                      <>
                        {/* Weekdays */}
                        {selectedBoat.breakdown.weekdayNights > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Weekdays <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 ml-1 font-medium">x{selectedBoat.breakdown.weekdayNights}</span></span>
                            <span className="font-bold text-gray-900">€{selectedBoat.breakdown.weekdayPrice * selectedBoat.breakdown.weekdayNights}</span>
                          </div>
                        )}
                        {/* Weekends */}
                        {selectedBoat.breakdown.weekendNights > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Weekends <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 ml-1 font-medium">x{selectedBoat.breakdown.weekendNights}</span></span>
                            <span className="font-bold text-gray-900">€{selectedBoat.breakdown.weekendPrice * selectedBoat.breakdown.weekendNights}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Preparation Fee</span>
                          <span className="font-bold text-gray-900">€{selectedBoat.breakdown.preparationFee}</span>
                        </div>

                        <div className="border-t border-slate-200 my-3" />

                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#010a1f]">Grand Total</span>
                          <span className="font-black text-xl text-[#010a1f]">
                            €{selectedBoat.breakdown.total.toLocaleString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Add dates to see the full price breakdown.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. STICKY BOOKING FOOTER */}
              <div className="px-6 py-5 border-t border-gray-200 bg-white/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Due Now (30%)</span>
                  <span className="text-2xl font-black text-green-600 leading-none">
                    {selectedBoat.breakdown ? `€${selectedBoat.breakdown.deposit.toLocaleString()}` : `€${selectedBoat.pricePerNight}`}
                  </span>
                </div>
                <Button asChild size="lg" className="rounded-full px-8 h-12 font-bold bg-[#010a1f] text-white hover:bg-green-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                  {/* Use ID as fallback to prevent 404, and include search params */}
                  <Link href={getReserveLink(selectedBoat)}>
                    Reserve Boat <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

export default function HouseboatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HouseboatsContent />
    </Suspense>
  );
}
