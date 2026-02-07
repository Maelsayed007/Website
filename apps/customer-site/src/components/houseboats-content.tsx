'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSupabase } from '@/components/providers/supabase-provider';
import HouseboatSearchCard from '@/components/houseboat-search-card';
import PackageCard from '@/components/package-card';
import { HouseboatModel, Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, differenceInDays, eachDayOfInterval, isWithinInterval, addDays, getDay, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Users, SlidersHorizontal, Search, Check, Info, MapPin, Anchor, DollarSign, Bed, Ship, Minus, Plus, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// Local UI Types
type HouseboatPrice = {
    model_id: string;
    weekday_price: number;
    weekend_price: number;
}

interface HouseboatsContentProps {
    dictionary: any;
}

export default function HouseboatsContent({ dictionary }: HouseboatsContentProps) {
    const { supabase } = useSupabase();
    const searchParams = useSearchParams();
    const router = useRouter();

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const guestsParam = searchParams.get('guests');
    const boatsParam = searchParams.get('boats');
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
    const [numberOfBoats, setNumberOfBoats] = useState(parseInt(boatsParam || '1') || 1);
    const [guestWarning, setGuestWarning] = useState('');
    // State
    const [isGuestsOpen, setIsGuestsOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // Data
    const [houseboats, setHouseboats] = useState<HouseboatModel[]>([]);
    const [boatUnits, setBoatUnits] = useState<{ id: string; model_id: string; name: string }[]>([]);
    const [prices, setPrices] = useState<HouseboatPrice[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [modelsRes, pricesRes, unitsRes] = await Promise.all([
                supabase.from('houseboat_models').select('*'),
                supabase.from('houseboat_prices').select('*'),
                supabase.from('boats').select('id, model_id, name')
            ]);

            if (modelsRes.data) {
                const mappedBoats = (modelsRes.data as any[]).map(boat => ({
                    ...boat,
                    optimalCapacity: boat.optimal_capacity,
                    maximumCapacity: boat.maximum_capacity,
                    imageUrls: boat.image_urls,
                    singleBeds: boat.single_beds,
                    doubleBeds: boat.double_beds,
                }));
                setHouseboats(mappedBoats);
            }
            if (pricesRes.data) setPrices(pricesRes.data as any);
            if (unitsRes.data) setBoatUnits(unitsRes.data as any);

            if (isSearchMode) {
                const { data: bookings } = await supabase.from('bookings').select('*').gte('end_time', new Date().toISOString());
                if (bookings) {
                    // Map raw snake_case data to camelCase Booking type
                    const mappedBookings: Booking[] = (bookings as any[]).map(b => ({
                        id: b.id,
                        clientName: b.client_name,
                        startTime: b.start_time,
                        endTime: b.end_time,
                        status: b.status,
                        source: b.source,
                        clientPhone: b.client_phone,
                        clientEmail: b.client_email,
                        notes: b.notes,
                        price: b.price,
                        discount: b.discount,
                        amount_paid: b.amount_paid,
                        payment_status: b.payment_status,
                        numberOfGuests: b.number_of_guests,
                        houseboatId: b.houseboat_id, // Critical mapping for availability check
                        // Include other fields as needed
                    }));
                    setAllBookings(mappedBookings);
                }
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
                // Relax capacity check if we are booking multiple boats (allowing smaller boats to combine)
                if (numberOfBoats === 1 && guestCount > (boat.maximumCapacity || 6)) isAvailable = false;

                // Date Check
                if (isAvailable && dateRange?.from && dateRange?.to) {
                    const requestedInterval = { start: dateRange.from, end: dateRange.to };

                    // 1. Get all physical boat units for this model
                    const modelUnits = boatUnits.filter(u => u.model_id === boat.id);

                    if (modelUnits.length === 0) {
                        // If no units exist for this model, it's not available
                        isAvailable = false;
                    } else {
                        // 2. Count how many units are busy
                        const busyUnitsCount = modelUnits.filter(unit => {
                            const unitBookings = allBookings.filter(b =>
                                b.houseboatId === unit.id &&
                                ['Confirmed', 'Pending'].includes(b.status)
                            );

                            return unitBookings.some(b => {
                                const start = parseISO(b.startTime);
                                const end = parseISO(b.endTime);
                                // Check overlap
                                return (
                                    isWithinInterval(requestedInterval.start, { start, end }) ||
                                    isWithinInterval(requestedInterval.end, { start, end }) ||
                                    isWithinInterval(start, { start: requestedInterval.start, end: requestedInterval.end })
                                );
                            });
                        }).length;

                        // 3. If all units are busy, the model is unavailable
                        if (busyUnitsCount >= modelUnits.length) {
                            isAvailable = false;
                        }
                    }
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
                optimalCapacity: boat.optimalCapacity || 4,
                maximumCapacity: boat.maximumCapacity || 6,
                imageUrls: boat.imageUrls || [],
                pricePerNight: priceObj.weekday_price || 150,
                totalPrice: isSearchMode ? total : undefined,
                breakdown,
                isAvailable,
                // FIX: Use ID if slug is missing to prevent 404s
                slug: boat.slug || boat.id,
                singleBeds: 0,
                doubleBeds: boat.bedrooms, // Mocked for now
                amenities: boat.amenities || [],
                licenseRequired: true,
            };
        })
            .filter(boat => !isSearchMode || boat.isAvailable)
            .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
    }, [houseboats, prices, allBookings, dateRange, guests, isSearchMode, numberOfBoats]);

    // Package type for multi-boat results
    type BoatPackage = {
        id: string;
        boats: HouseboatModel[];
        totalCapacity: number;
        totalOptimalCapacity: number;
        totalPrice: number;
    };

    // Generate packages when multiple boats selected
    const generatedPackages = useMemo((): BoatPackage[] => {
        if (numberOfBoats <= 1 || !isSearchMode) return [];

        const availableBoatsPool: HouseboatModel[] = [];
        const guestCount = parseInt(guests) || 2;

        processedHouseboats.forEach(model => {
            const modelUnits = boatUnits.filter(u => u.model_id === model.id);
            const totalUnitsCount = modelUnits.length > 0 ? modelUnits.length : 1;

            let bookedCount = 0;
            if (dateRange?.from && dateRange?.to) {
                const requestedInterval = { start: dateRange.from, end: dateRange.to };

                // Count busy units for this model
                bookedCount = modelUnits.filter(unit => {
                    const unitBookings = allBookings.filter(b =>
                        b.houseboatId === unit.id &&
                        ['Confirmed', 'Pending'].includes(b.status)
                    );

                    return unitBookings.some(b => {
                        const start = parseISO(b.startTime);
                        const end = parseISO(b.endTime);
                        return (
                            isWithinInterval(requestedInterval.start, { start, end }) ||
                            isWithinInterval(requestedInterval.end, { start, end }) ||
                            isWithinInterval(start, { start: requestedInterval.start, end: requestedInterval.end })
                        );
                    });
                }).length;
            }

            const availableCount = Math.max(0, totalUnitsCount - bookedCount);

            for (let i = 0; i < availableCount; i++) {
                availableBoatsPool.push(model);
            }
        });

        if (availableBoatsPool.length < numberOfBoats) return [];

        const maxBoatsToUse = Math.min(numberOfBoats, availableBoatsPool.length, 6);

        const getCombinations = (arr: HouseboatModel[], k: number): HouseboatModel[][] => {
            if (k > arr.length || k <= 0) return [];
            if (k === arr.length) return [arr];
            if (k === 1) return arr.map(item => [item]);

            const result: HouseboatModel[][] = [];
            const indices = Array.from({ length: k }, (_, i) => i);

            while (indices[0] <= arr.length - k) {
                result.push(indices.map(i => arr[i]));

                let t = k - 1;
                while (t >= 0 && indices[t] === arr.length - k + t) t--;

                if (t < 0) break;

                indices[t]++;
                for (let j = t + 1; j < k; j++) {
                    indices[j] = indices[j - 1] + 1;
                }
            }

            return result;
        };

        const combos = getCombinations(availableBoatsPool, maxBoatsToUse);

        const packages: BoatPackage[] = combos
            .map((combo, idx) => {
                const totalCap = combo.reduce((sum, b) => sum + (b.maximumCapacity || 0), 0);
                const totalOptimal = combo.reduce((sum, b) => sum + (b.optimalCapacity || 4), 0);
                const totalPrice = combo.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
                return {
                    id: `pkg-${idx}`,
                    boats: combo,
                    totalCapacity: totalCap,
                    totalOptimalCapacity: totalOptimal,
                    totalPrice
                };
            })
            .filter(pkg => {
                const minConfig = guestCount;
                const maxConfig = guestCount + 2;
                return pkg.totalOptimalCapacity >= minConfig && pkg.totalOptimalCapacity <= maxConfig;
            });

        const uniquePackagesMap = new Map<string, BoatPackage>();

        packages.forEach(pkg => {
            const compositionKey = pkg.boats
                .map(b => b.id)
                .sort()
                .join('|');

            if (!uniquePackagesMap.has(compositionKey)) {
                uniquePackagesMap.set(compositionKey, pkg);
            }
        });

        const uniquePackages = Array.from(uniquePackagesMap.values());

        return uniquePackages
            .sort((a, b) => {
                const aDiff = a.totalCapacity - guestCount;
                const bDiff = b.totalCapacity - guestCount;
                return aDiff - bDiff || a.totalPrice - b.totalPrice;
            })
            .slice(0, 5);
    }, [processedHouseboats, numberOfBoats, guests, isSearchMode]);


    const handleSearch = () => {
        if (!dateRange?.from || !dateRange?.to) return;
        const params = new URLSearchParams();
        params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
        params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
        params.set('guests', guests);
        params.set('boats', numberOfBoats.toString());
        router.push(`/houseboats?${params.toString()}`);
    };

    const handleClear = () => {
        setDateRange(undefined);
        setGuests('2');
        setNumberOfBoats(1);
        router.push('/houseboats');
    };

    const t = dictionary.houseboats;

    return (
        <div className="min-h-screen bg-[#f8f9fa]">

            <div className="relative pt-32 pb-20 overflow-hidden bg-[#18230F]">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/boat-hero.jpg"
                        alt="Amieira Marina Boat"
                        fill
                        className="object-cover opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#18230F]/80 via-transparent to-[#18230F]/90" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-display font-medium text-white mb-4 tracking-tight">
                        {t.hero?.title || "Find your perfect escape"}
                    </h1>
                    <p className="text-white/70 max-w-2xl mx-auto text-lg">
                        {t.hero?.subtitle || "Discover our exclusive fleet of houseboats on the Alqueva Lake."}
                    </p>
                </div>
            </div>

            <div className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 shadow-sm transition-all duration-300">
                <div className="mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                        <div className="hidden lg:flex items-center w-full max-w-7xl mx-auto px-4">
                            <div className="flex items-center justify-center w-full py-2">
                                <div className="px-5 py-2 flex items-center h-[52px] rounded-xl transition-all duration-200 hover:bg-gray-50 cursor-not-allowed group min-w-[180px] shrink-0">
                                    <MapPin className="w-5 h-5 text-gray-400 mr-3 group-hover:text-emerald-600 transition-colors" />
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Location</span>
                                        <span className="text-sm font-semibold text-[#3c4043] truncate w-full text-left">Alqueva Lake</span>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-gray-200 my-auto" />

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="px-5 py-2 flex items-center h-[52px] rounded-xl transition-all duration-200 hover:bg-gray-50 text-left group min-w-[150px]">
                                            <CalendarIcon className="w-5 h-5 text-gray-400 mr-3 group-hover:text-emerald-600 transition-colors" />
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap">Check-in</span>
                                                <span className="text-sm font-semibold text-[#3c4043] truncate">
                                                    {dateRange?.from ? format(dateRange.from, "MMM dd") : "Add date"}
                                                </span>
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-50 bg-white border-none shadow-2xl" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            disabled={(date) => date < new Date()}
                                            className="rounded-xl shadow-xl bg-white"
                                        />
                                    </PopoverContent>
                                </Popover>

                                <div className="w-px h-8 bg-gray-200 my-auto" />

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="px-5 py-2 flex items-center h-[52px] rounded-xl transition-all duration-200 hover:bg-gray-50 text-left group min-w-[150px]">
                                            <CalendarIcon className="w-5 h-5 text-gray-400 mr-3 group-hover:text-emerald-600 transition-colors" />
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap">Check-out</span>
                                                <span className="text-sm font-semibold text-[#3c4043] truncate">
                                                    {dateRange?.to ? format(dateRange.to, "MMM dd") : "Add date"}
                                                </span>
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-50 bg-white border-none shadow-2xl" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            disabled={(date) => date < new Date()}
                                            className="rounded-xl shadow-xl bg-white"
                                        />
                                    </PopoverContent>
                                </Popover>

                                <div className="relative flex items-center">
                                    <div className="w-px h-8 bg-gray-200 my-auto mr-0" />
                                    <Popover open={isGuestsOpen} onOpenChange={setIsGuestsOpen}>
                                        <PopoverTrigger asChild>
                                            <div className={cn(
                                                "px-5 py-2 flex items-center h-[52px] cursor-pointer transition-all duration-200 hover:bg-gray-50 min-w-[130px] shrink-0 rounded-xl",
                                                isGuestsOpen && "bg-gray-50"
                                            )}>
                                                <div className={cn("w-2 h-2 rounded-full mr-3 shrink-0", parseInt(guests) > 0 ? "bg-emerald-500" : "bg-gray-300")} />
                                                <div className="flex flex-col items-start overflow-hidden">
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Guests</span>
                                                    <span className="text-sm font-semibold text-[#3c4043] truncate">{guests} Guests</span>
                                                </div>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[340px] p-6 rounded-3xl shadow-xl border-none" align="center" side="bottom" sideOffset={8}>
                                            {guestWarning && (
                                                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-700 font-medium leading-relaxed">{guestWarning}</p>
                                                </div>
                                            )}

                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-base font-medium text-gray-700">Adults & Children</span>
                                                        <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                                                onClick={() => {
                                                                    const current = parseInt(guests) || 0;
                                                                    setGuests(Math.max(0, current - 1).toString());
                                                                }}
                                                                disabled={parseInt(guests) <= 0}
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </Button>
                                                            <span className="w-4 text-center font-semibold text-gray-900">{guests}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                                                onClick={() => {
                                                                    const current = parseInt(guests) || 0;
                                                                    setGuests(Math.min(100, current + 1).toString());
                                                                }}
                                                                disabled={parseInt(guests) >= 100}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 text-center">Max capacity varies by boat package.</p>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="w-px h-8 bg-gray-200 my-auto" />

                                <div className="px-5 py-2 flex items-center h-[52px] hover:bg-gray-50 transition-all w-[130px] shrink-0 rounded-xl">
                                    <Anchor className={cn("w-5 h-5 mr-3 transition-colors", numberOfBoats > 1 ? "text-emerald-500" : "text-gray-400")} />
                                    <div className="flex flex-col w-full">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Boats</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={numberOfBoats}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val >= 1 && val <= 5) setNumberOfBoats(val);
                                            }}
                                            className="w-full bg-transparent border-none p-0 h-5 text-sm font-semibold text-[#3c4043] focus:ring-0 focus:outline-none [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5 ml-1">
                                        <button
                                            onClick={() => setNumberOfBoats(Math.min(5, numberOfBoats + 1))}
                                            className="text-gray-400 hover:text-emerald-600"
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => setNumberOfBoats(Math.max(1, numberOfBoats - 1))}
                                            className="text-gray-400 hover:text-emerald-600"
                                        >
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pl-2">
                                    <Button
                                        onClick={handleSearch}
                                        className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold h-[48px] px-8 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow-md shrink-0"
                                    >
                                        <Search className="w-4 h-4" />
                                        <span>Update</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:hidden w-full px-4 py-3 flex flex-col items-center gap-2">
                            <button
                                onClick={() => setIsSearchExpanded?.(!isSearchExpanded)}
                                className="w-full max-w-sm flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left"
                            >
                                <Search className="w-5 h-5 text-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900 leading-none">Filters</span>
                                    <span className="text-[10px] text-gray-500 truncate">
                                        {dateRange?.from ? format(dateRange.from, "MMM dd") : "Add dates"} • {guests} Guests
                                    </span>
                                </div>
                            </button>

                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {processedHouseboats.length} boats found
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div className="container mx-auto px-4 py-6 md:py-8 min-h-[60vh]">
                <div className="w-full max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[200px] w-full rounded-3xl bg-gray-200" />)}
                        </div>
                    ) : numberOfBoats > 1 && generatedPackages.length > 0 ? (
                        <>
                            <div className="mb-6">
                                <h2 className="text-2xl font-display font-bold text-[#18230F]">Package Options</h2>
                                <p className="text-gray-500 mt-1">{generatedPackages.length} package combinations found for {guests} guests across {numberOfBoats} boats</p>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                                {generatedPackages.map((pkg, idx) => (
                                    <PackageCard
                                        key={pkg.id}
                                        pkg={pkg}
                                        index={idx}
                                        dateRange={dateRange}
                                        guests={guests}
                                    />
                                ))}
                            </div>
                        </>
                    ) : numberOfBoats > 1 && generatedPackages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                            <div className="bg-emerald-50 p-4 rounded-full mb-4">
                                <Ship className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-[#18230F]">No package combinations available</h3>
                            <p className="text-gray-500 mt-2 mb-6 text-center max-w-md">We couldn't find {numberOfBoats} available boats to accommodate your group for these dates. Try reducing the number of boats or checking different dates.</p>
                            <Button onClick={() => setNumberOfBoats(Math.max(1, numberOfBoats - 1))} className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold rounded-xl px-6 h-12 shadow-sm transition-all hover:shadow-md">
                                Try {Math.max(1, numberOfBoats - 1)} Boats
                            </Button>
                        </div>
                    ) : processedHouseboats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
                            {processedHouseboats.map(boat => (
                                <HouseboatSearchCard
                                    key={boat.id}
                                    boat={boat}
                                    requestedGuests={parseInt(guests) || 2}
                                    dictionary={dictionary.houseboat}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                            <div className="bg-emerald-50 p-4 rounded-full mb-4">
                                <Search className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-[#18230F]">No boats found</h3>
                            <p className="text-gray-500 mt-2 mb-6 text-center text-lg">Try adjusting your dates or guest count.</p>
                            <Button onClick={handleClear} className="bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] font-bold rounded-xl px-6 h-12 shadow-sm transition-all hover:shadow-md">
                                Reset Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
