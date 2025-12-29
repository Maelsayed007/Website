'use client';

import { v4 as uuidv4 } from 'uuid';
import { Suspense, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachDayOfInterval, format, differenceInCalendarDays, parseISO, getDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BedDouble, DoorClosed, Bath, CookingPot, Check, ArrowLeft, CreditCard, X, ChevronLeft, ChevronRight, Anchor, Fuel, Clock, ShieldCheck, CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type HouseboatDetailProps = { slug: string };

function Lightbox({ images, initialIndex, onClose }: { images: string[], initialIndex: number, onClose: () => void }) {
    const [index, setIndex] = useState(initialIndex);
    const next = useCallback((e?: React.MouseEvent) => { e?.stopPropagation(); setIndex((i) => (i + 1) % images.length); }, [images.length]);
    const prev = useCallback((e?: React.MouseEvent) => { e?.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }, [images.length]);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [next, prev, onClose]);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
            <Button variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10" onClick={onClose}><X className="w-6 h-6" /></Button>
            <Button variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full" onClick={prev}><ChevronLeft className="w-6 h-6" /></Button>
            <Button variant="ghost" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full" onClick={next}><ChevronRight className="w-6 h-6" /></Button>
            <motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-5xl aspect-[16/9]" onClick={(e) => e.stopPropagation()}>
                <Image src={images[index]} alt="" fill className="object-contain" priority />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">{index + 1} / {images.length}</div>
            </motion.div>
        </motion.div>
    );
}

function HouseboatDetailContent({ slug: modelId }: { slug: string }) {
    const { supabase } = useSupabase();
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [houseboat, setHouseboat] = useState<any | null>(null);
    const [prices, setPrices] = useState<any[]>([]);
    const [boats, setBoats] = useState<any[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [extras, setExtras] = useState<any[]>([]);
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from'), to = searchParams.get('to');
        if (from && to) { try { return { from: parseISO(from), to: parseISO(to) }; } catch { return undefined; } }
        return undefined;
    });
    const [numGuests, setNumGuests] = useState<number>(() => parseInt(searchParams.get('guests') || '2'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingCost, setBookingCost] = useState<{ total: number; weekdayNights: number; weekendNights: number; weekdayPrice: number; weekendPrice: number; preparationFee: number; deposit: number; extrasTotal: number } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [clientDetails, setClientDetails] = useState({ name: '', email: '', phone: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) return;
            setIsLoading(true);
            try {
                const [{ data: modelData }, { data: pricesData }, { data: boatsData }, { data: bookingsData }, { data: extrasData }] = await Promise.all([
                    supabase.from('houseboat_models').select('*').eq('id', modelId).single(),
                    supabase.from('houseboat_prices').select('*').eq('model_id', modelId),
                    supabase.from('boats').select('*').eq('model_id', modelId),
                    supabase.from('bookings').select('*'),
                    supabase.from('extras').select('*').in('type', ['all', 'houseboat'])
                ]);
                setHouseboat(modelData);
                setPrices(pricesData || []);
                setBoats(boatsData || []);
                setAllBookings(bookingsData || []);
                setExtras(extrasData || []);
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [supabase, modelId]);

    useEffect(() => {
        if (!selectedDateRange?.from || !selectedDateRange?.to || !prices) { setBookingCost(null); return; }
        const nights = differenceInCalendarDays(selectedDateRange.to, selectedDateRange.from);
        if (nights <= 0) { setBookingCost(null); return; }
        const priceObj = prices[0] || { weekday_price: 150, weekend_price: 150 };
        let weekdayCount = 0, weekendCount = 0;
        eachDayOfInterval({ start: selectedDateRange.from, end: selectedDateRange.to }).slice(0, -1).forEach(d => { const day = getDay(d); if (day === 5 || day === 6) weekendCount++; else weekdayCount++; });
        const preparationFee = 76;
        let extrasTotal = 0;
        selectedExtras.forEach(id => { const extra = extras.find(e => e.id === id); if (extra) extrasTotal += extra.price_type === 'per_day' ? extra.price * nights : extra.price; });
        const total = (weekdayCount * priceObj.weekday_price) + (weekendCount * priceObj.weekend_price) + preparationFee + extrasTotal;
        setBookingCost({ total, weekdayNights: weekdayCount, weekendNights: weekendCount, weekdayPrice: priceObj.weekday_price, weekendPrice: priceObj.weekend_price, preparationFee, deposit: Math.ceil(total * 0.30), extrasTotal });
    }, [selectedDateRange, prices, selectedExtras, extras]);

    const checkAvailability = () => {
        if (!selectedDateRange?.from || !selectedDateRange?.to || !boats.length) return null;
        const req = { start: selectedDateRange.from, end: selectedDateRange.to };
        const available = boats.filter(boat => {
            const bookings = allBookings.filter((b: any) => b.houseboat_id === boat.id && b.status !== 'Cancelled');
            return !bookings.some((b: any) => b.start_time && b.end_time && req.start < new Date(b.end_time) && req.end > new Date(b.start_time));
        });
        return available.length > 0 ? available[0].id : null;
    };

    const handleRequestBooking = () => {
        if (!selectedDateRange?.from || !selectedDateRange?.to) { toast({ variant: "destructive", title: "Select dates" }); return; }
        if (user) setClientDetails({ name: user.user_metadata?.username || '', email: user.email || '', phone: '' });
        setIsConfirmOpen(true);
    };

    const handleConfirmBooking = async () => {
        if (!supabase || !selectedDateRange?.from || !selectedDateRange?.to || !clientDetails.name || !clientDetails.email || !clientDetails.phone) { toast({ variant: 'destructive', title: "Missing Details" }); return; }
        setIsSubmitting(true);
        const boatId = checkAvailability();
        if (!boatId) { toast({ variant: 'destructive', title: "No Availability" }); setIsSubmitting(false); return; }
        try {
            const { error } = await supabase.from('bookings').insert({ id: uuidv4(), houseboat_id: boatId, client_name: clientDetails.name, client_email: clientDetails.email, client_phone: clientDetails.phone, start_time: selectedDateRange.from.toISOString(), end_time: selectedDateRange.to.toISOString(), status: 'Pending', source: 'Website', price: bookingCost?.total || 0, selected_extras: selectedExtras });
            if (error) throw error;
            toast({ title: "Booking Sent!" }); router.push('/payment-instructions');
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
        finally { setIsSubmitting(false); setIsConfirmOpen(false); }
    };

    const openLightbox = (i: number) => { setLightboxIndex(i); setIsLightboxOpen(true); };

    if (isLoading) return <HouseboatDetailSkeleton />;
    if (!houseboat) return <div className="p-20 text-center text-xl">Houseboat not found.</div>;

    const { name, description, optimal_capacity, maximum_capacity, kitchens, bathrooms, bedrooms, image_urls, double_beds, single_beds, sofa_beds } = houseboat;
    const images = image_urls || [];
    const totalBeds = (double_beds || 0) + (single_beds || 0) + (sofa_beds || 0);

    return (
        <>
            <AnimatePresence>{isLightboxOpen && <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setIsLightboxOpen(false)} />}</AnimatePresence>

            <div className="bg-white min-h-screen pt-[72px]">
                <div className="container mx-auto max-w-7xl px-4 py-6">
                    <Link href="/houseboats" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-medium mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Houseboats
                    </Link>

                    {/* Hero: Photos + Booking Card */}
                    <div className="grid lg:grid-cols-3 gap-6 mb-8">
                        {/* Photos */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer shadow-lg" onClick={() => openLightbox(0)}>
                                {images[0] ? <Image src={images[0]} alt={name} fill className="object-cover hover:scale-105 transition-transform duration-500" priority /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>}
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-md" onClick={() => openLightbox(i)}>
                                        {images[i] ? <Image src={images[i]} alt="" fill className="object-cover hover:opacity-90 transition-opacity" /> : <div className="w-full h-full bg-gray-100" />}
                                        {i === 5 && images.length > 6 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg rounded-xl">+{images.length - 6}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Booking Card - Redesigned (Screenshot 1) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden sticky top-24">
                                <div className="bg-[#0B1120] text-white p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><Anchor className="w-5 h-5 text-white" /></div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">BOOK YOUR STAY</p>
                                            <p className="text-xl font-bold">{name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Booking Card - Refined Styles */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="flex flex-col items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-all text-left shadow-sm">
                                                    <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5">CHECK-IN</span>
                                                    <span className="text-base font-bold text-gray-900">{selectedDateRange?.from ? format(selectedDateRange.from, 'MMM d') : 'Select'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><CalendarPicker mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} disabled={(d) => d < new Date()} /></PopoverContent>
                                        </Popover>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="flex flex-col items-start p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-all text-left shadow-sm">
                                                    <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5">CHECK-OUT</span>
                                                    <span className="text-base font-bold text-gray-900">{selectedDateRange?.to ? format(selectedDateRange.to, 'MMM d') : 'Select'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><CalendarPicker mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} disabled={(d) => d < new Date()} /></PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="mb-4">
                                        <Select value={String(numGuests)} onValueChange={val => setNumGuests(Number(val))}>
                                            <SelectTrigger className="w-full h-[52px] bg-white border-gray-200 rounded-lg text-gray-700 font-medium px-4 shadow-sm hover:border-blue-500 transition-all">
                                                <div className="flex items-center gap-3 w-full">
                                                    <Users className="w-5 h-5 text-gray-400" />
                                                    <span className="text-base">{numGuests} Guest{numGuests > 1 ? 's' : ''}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>{[...Array(maximum_capacity || 6)].map((_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} Guest{i > 0 ? 's' : ''}</SelectItem>)}</SelectContent>
                                        </Select>

                                        {/* Extra Bed Warning - Immediately below Guests */}
                                        {numGuests > (Number(optimal_capacity) || 2) && numGuests <= (Number(maximum_capacity) || 6) && (
                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-amber-600 font-bold text-xs">!</span>
                                                </div>
                                                <p className="text-xs text-amber-800 leading-snug">
                                                    <span className="font-bold">Note:</span> For {numGuests} guests, an extra bed will be made in the living room table area.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price List - Cleaner Styles */}
                                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-6 shadow-sm">
                                        {bookingCost ? (
                                            <>
                                                <div className="p-5 space-y-3 bg-gray-50/50">
                                                    {bookingCost.weekdayNights > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 text-sm font-medium">{bookingCost.weekdayNights} × €{bookingCost.weekdayPrice} weekday</span>
                                                            <span className="font-bold text-gray-900 text-base">€{bookingCost.weekdayNights * bookingCost.weekdayPrice}</span>
                                                        </div>
                                                    )}
                                                    {bookingCost.weekendNights > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 text-sm font-medium">{bookingCost.weekendNights} × €{bookingCost.weekendPrice} weekend</span>
                                                            <span className="font-bold text-gray-900 text-base">€{bookingCost.weekendNights * bookingCost.weekendPrice}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                        <span className="text-gray-500 text-sm font-medium">Prep & Taxes</span>
                                                        <span className="font-bold text-gray-900 text-base">€{bookingCost.preparationFee}</span>
                                                    </div>
                                                    {bookingCost.extrasTotal > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 text-sm font-medium">Extras</span>
                                                            <span className="font-bold text-emerald-600 text-base">+€{bookingCost.extrasTotal}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-[#0B1120] px-5 py-4 flex justify-between items-center text-white">
                                                    <span className="font-bold text-lg">Total</span>
                                                    <span className="font-black text-2xl tracking-tight">€{bookingCost.total}</span>
                                                </div>
                                                <div className="bg-[#ECFDF5] px-5 py-3 text-center border-t border-emerald-100">
                                                    <p className="text-xs text-[#059669] font-bold uppercase tracking-wide">Min. €{bookingCost.deposit} deposit (30%) to confirm</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-8 text-center bg-gray-50/30">
                                                <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                                <p className="text-sm text-gray-500 font-medium">Select dates to see pricing</p>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleRequestBooking}
                                        className="w-full h-14 font-bold text-lg rounded-xl bg-[#34D399] hover:bg-[#10B981] text-white shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
                                        disabled={!selectedDateRange?.from || !selectedDateRange?.to}
                                    >
                                        Request a Reservation
                                    </Button>
                                    <p className="text-center text-[11px] text-gray-400 font-medium mt-3">No charge until confirmation</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section - 2 Columns */}
                    <div className="grid lg:grid-cols-2 gap-8 mb-5">
                        {/* Left Column: Features */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">BOAT FEATURES</h3>
                                <div className="h-px bg-gray-200 flex-1"></div>
                            </div>

                            <div className="flex gap-2 w-full overflow-x-auto pb-4 scrollbar-hide">
                                <div className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] text-center flex-1 shadow-sm hover:shadow-md transition-all">
                                    <Users className="w-6 h-6 mx-auto text-gray-800 mb-2 stroke-[1.5]" />
                                    <p className="font-bold text-gray-900 text-sm leading-none mb-1">{optimal_capacity}-{maximum_capacity}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">GUESTS</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] text-center flex-1 shadow-sm hover:shadow-md transition-all">
                                    <DoorClosed className="w-6 h-6 mx-auto text-gray-800 mb-2 stroke-[1.5]" />
                                    <p className="font-bold text-gray-900 text-sm leading-none mb-1">{bedrooms}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">CABINS</p>
                                </div>

                                {/* Beds Feature - FIXED: Shows Type Directly */}
                                <div className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] text-center flex-1 shadow-sm hover:shadow-md transition-all">
                                    <BedDouble className="w-6 h-6 mx-auto text-gray-800 mb-2 stroke-[1.5]" />
                                    <p className="font-bold text-gray-900 text-xs leading-none mb-1 line-clamp-1">
                                        {double_beds > 0 ? `${double_beds} Double` : (single_beds > 0 ? `${single_beds} Single` : `${totalBeds} Beds`)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">BED</p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] text-center flex-1 shadow-sm hover:shadow-md transition-all">
                                    <Bath className="w-6 h-6 mx-auto text-gray-800 mb-2 stroke-[1.5]" />
                                    <p className="font-bold text-gray-900 text-sm leading-none mb-1">{bathrooms}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">BATHS</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 min-w-[90px] text-center flex-1 shadow-sm hover:shadow-md transition-all">
                                    <CookingPot className="w-6 h-6 mx-auto text-gray-800 mb-2 stroke-[1.5]" />
                                    <p className="font-bold text-gray-900 text-sm leading-none mb-1">{kitchens}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">KITCHEN</p>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="mt-6 space-y-4">
                                <div className="prose prose-sm max-w-none text-gray-600">
                                    <p>{description || "Experience the Alqueva Lake like never before aboard this stunning houseboat."}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Policies (Screenshot 2, grid layout) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 hover:border-blue-200 transition-colors">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
                                    <h4 className="font-bold text-gray-900 text-sm">Payment</h4>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">Minimum 30% deposit to confirm your booking (or pay full amount). Remaining balance due at check-in.</p>
                            </div>
                            <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 hover:border-yellow-200 transition-colors">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center"><Fuel className="w-4 h-4" /></div>
                                    <h4 className="font-bold text-gray-900 text-sm">Fuel</h4>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">Boats are delivered with a full tank. At check-out, fuel consumption is calculated and charged accordingly.</p>
                            </div>
                            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 hover:border-green-200 transition-colors">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
                                    <h4 className="font-bold text-gray-900 text-sm">Responsibility</h4>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">A responsibility term is signed at check-in. Boat must be returned clean. Any damages will be charged accordingly.</p>
                            </div>
                            <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 hover:border-purple-200 transition-colors">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                                    <h4 className="font-bold text-gray-900 text-sm">Check-in/out</h4>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">Times are based on staff availability. Late check-out is possible with additional fees upon request.</p>
                            </div>
                        </div>
                    </div>

                    {/* Extras */}
                    {extras.length > 0 && (
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-8">
                            <h2 className="font-bold text-gray-900 mb-3">Add Extras to Your Trip</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {extras.map(extra => (
                                    <div key={extra.id} className={cn("p-3 rounded-xl border cursor-pointer transition-all", selectedExtras.includes(extra.id) ? "bg-primary/5 border-primary shadow-sm" : "bg-gray-50 border-gray-200 hover:border-gray-300")} onClick={() => setSelectedExtras(prev => prev.includes(extra.id) ? prev.filter(e => e !== extra.id) : [...prev, extra.id])}>
                                        <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm text-gray-900">{extra.name}</span>{selectedExtras.includes(extra.id) && <Check className="w-4 h-4 text-primary" />}</div>
                                        <p className="text-[11px] text-gray-500 mb-1">{extra.description}</p>
                                        <p className="text-primary font-bold">€{extra.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer is now handled by the global AppLayout which uses the updated Footer component */}
            </div>

            {/* Booking Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Confirm Your Booking</DialogTitle><DialogDescription>Enter your details to complete the reservation.</DialogDescription></DialogHeader>
                    <div className="space-y-3 py-4">
                        {user && <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700"><span className="font-semibold">Welcome back!</span> Your details are prefilled.</div>}
                        <div><Label className="text-xs font-medium text-gray-600">Full Name</Label><Input value={clientDetails.name} onChange={e => setClientDetails(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="mt-1" /></div>
                        <div><Label className="text-xs font-medium text-gray-600">Email</Label><Input type="email" value={clientDetails.email} onChange={e => setClientDetails(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" className="mt-1" /></div>
                        <div><Label className="text-xs font-medium text-gray-600">Phone</Label><Input value={clientDetails.phone} onChange={e => setClientDetails(p => ({ ...p, phone: e.target.value }))} placeholder="+351 XXX XXX XXX" className="mt-1" /></div>
                    </div>
                    <DialogFooter className="flex-row gap-2"><Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="flex-1">Cancel</Button><Button onClick={handleConfirmBooking} disabled={isSubmitting} className="flex-1">{isSubmitting ? "Processing..." : "Confirm"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function HouseboatDetailSkeleton() {
    return (
        <div className="min-h-screen pt-20 container mx-auto px-4 max-w-7xl">
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 space-y-4"><Skeleton className="aspect-[16/9] rounded-2xl" /><div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div></div>
                <Skeleton className="h-[500px] rounded-2xl" />
            </div>
        </div>
    );
}

export default function HouseboatDetail({ slug }: HouseboatDetailProps) {
    return <Suspense fallback={<HouseboatDetailSkeleton />}><HouseboatDetailContent slug={slug} /></Suspense>;
}
