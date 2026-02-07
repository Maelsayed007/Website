'use client';

import { v4 as uuidv4 } from 'uuid';
import { Suspense, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { eachDayOfInterval, format, differenceInCalendarDays, parseISO, getDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BedDouble, DoorClosed, Bath, CookingPot, Check, ArrowLeft, CreditCard, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Anchor, Fuel, Clock, ShieldCheck, CalendarDays, MapPin } from 'lucide-react';
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
    const [isBookBarExpanded, setIsBookBarExpanded] = useState(false);


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
        if (!houseboat) { toast({ variant: "destructive", title: "Houseboat data not loaded" }); return; }

        const params = new URLSearchParams({
            boatId: houseboat.id,
            from: selectedDateRange.from.toISOString(),
            to: selectedDateRange.to.toISOString(),
            guests: numGuests.toString()
        });

        if (selectedExtras.length > 0) {
            params.append('extras', selectedExtras.join(','));
        }

        router.push(`/checkout?${params.toString()}`);
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
                    <Link href="/houseboats" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#34C759] font-bold mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Houseboats
                    </Link>

                    {/* Hero: Photos */}
                    <div className="grid lg:grid-cols-[1.5fr,1fr] gap-8 mb-12">
                        {/* Left Column: Photos */}
                        <div className="space-y-4">
                            <div className="relative aspect-[3/2] rounded-2xl overflow-hidden cursor-pointer shadow-lg" onClick={() => openLightbox(0)}>
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

                        {/* Right Column: About, Features & Policies */}
                        <div className="flex flex-col">
                            {/* About Section */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <h3 className="font-display text-3xl text-[#18230F] tracking-tight">About This Boat</h3>
                                    <div className="h-px bg-gray-100 flex-1"></div>
                                </div>
                                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed font-medium">
                                    <p>{description || "Experience the Alqueva Lake like never before aboard this stunning houseboat."}</p>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <h3 className="font-display text-3xl text-[#18230F] tracking-tight">Boat Features</h3>
                                    <div className="h-px bg-gray-100 flex-1"></div>
                                </div>

                                <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm hover:border-[#34C759]/30 transition-all min-w-[85px] flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                                            <Users className="w-4 h-4 text-[#34C759] stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-xl text-[#18230F] leading-none mb-1">{optimal_capacity}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">GUESTS</p>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm hover:border-[#34C759]/30 transition-all min-w-[85px] flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                                            <DoorClosed className="w-4 h-4 text-[#34C759] stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-xl text-[#18230F] leading-none mb-1">{bedrooms}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">CABINS</p>
                                    </div>

                                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm hover:border-[#34C759]/30 transition-all min-w-[85px] flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                                            <BedDouble className="w-4 h-4 text-[#34C759] stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-base text-[#18230F] leading-none mb-1 line-clamp-1 whitespace-nowrap">
                                            {double_beds > 0 ? `${double_beds} Double` : (single_beds > 0 ? `${single_beds} Single` : `${totalBeds} Beds`)}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">BED</p>
                                    </div>

                                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm hover:border-[#34C759]/30 transition-all min-w-[85px] flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                                            <Bath className="w-4 h-4 text-[#34C759] stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-xl text-[#18230F] leading-none mb-1">{bathrooms}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">BATHS</p>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm hover:border-[#34C759]/30 transition-all min-w-[85px] flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                                            <CookingPot className="w-4 h-4 text-[#34C759] stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-xl text-[#18230F] leading-none mb-1">{kitchens}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">KITCHEN</p>
                                    </div>
                                </div>
                            </div>

                            {/* Policies Section */}
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <h3 className="font-display text-3xl text-[#18230F] tracking-tight">Houseboat Policies</h3>
                                    <div className="h-px bg-gray-100 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#34C759]/30 transition-all group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#34C759] flex items-center justify-center group-hover:bg-[#34C759] group-hover:text-white transition-colors"><CreditCard className="w-4 h-4" /></div>
                                            <h4 className="font-black text-[#18230F] text-xs uppercase tracking-wider">Payment</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">30% deposit to confirm. Balance at check-in.</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#34C759]/30 transition-all group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#34C759] flex items-center justify-center group-hover:bg-[#34C759] group-hover:text-white transition-colors"><Fuel className="w-4 h-4" /></div>
                                            <h4 className="font-black text-[#18230F] text-xs uppercase tracking-wider">Fuel</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Boats full. Consumption charged at check-out.</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#34C759]/30 transition-all group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#34C759] flex items-center justify-center group-hover:bg-[#34C759] group-hover:text-white transition-colors"><ShieldCheck className="w-4 h-4" /></div>
                                            <h4 className="font-black text-[#18230F] text-xs uppercase tracking-wider">Security</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Term signed at check-in. Damages charged accordingly.</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#34C759]/30 transition-all group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#34C759] flex items-center justify-center group-hover:bg-[#34C759] group-hover:text-white transition-colors"><Clock className="w-4 h-4" /></div>
                                            <h4 className="font-black text-[#18230F] text-xs uppercase tracking-wider">Check-in</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Based on availability. Late check-out possible.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Relocated Extras Section */}
                            {extras.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <h3 className="font-display text-3xl text-[#18230F] tracking-tight">Add Extras to Your Trip</h3>
                                        <div className="h-px bg-gray-100 flex-1"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {extras.map(extra => (
                                            <div key={extra.id} className={cn("p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between", selectedExtras.includes(extra.id) ? "bg-emerald-50 border-[#34C759] shadow-sm" : "bg-white border-gray-100 hover:border-[#34C759]/30")} onClick={() => setSelectedExtras(prev => prev.includes(extra.id) ? prev.filter(e => e !== extra.id) : [...prev, extra.id])}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-[#18230F]">{extra.name}</span>
                                                    <p className="text-[#34C759] font-black text-xs">€{extra.price}</p>
                                                </div>
                                                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", selectedExtras.includes(extra.id) ? "bg-[#34C759] border-[#34C759]" : "bg-gray-50 border-gray-100")}>
                                                    {selectedExtras.includes(extra.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>



            {/* Sticky Bottom Booking Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-[50] pb-[env(safe-area-inset-bottom)]">
                <AnimatePresence>
                    {isBookBarExpanded && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white border-t border-gray-100 shadow-[0_-15px_50px_rgba(0,0,0,0.1)] overflow-hidden rounded-t-[40px]"
                        >
                            <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] tracking-[0.25em] font-medium text-gray-400">Plan your stay</p>
                                    <p className="text-3xl font-display font-bold text-[#18230F]">{name}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-300 hover:text-[#18230F] hover:bg-gray-50 rounded-full h-12 w-12"
                                    onClick={() => setIsBookBarExpanded(false)}
                                >
                                    <ChevronDown className="w-7 h-7" />
                                </Button>
                            </div>

                            <div className="max-w-7xl mx-auto p-6 lg:p-8 grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="flex flex-col items-start p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-[#34C759]/40 hover:bg-white transition-all text-left group shadow-sm">
                                                    <span className="text-xs text-gray-400 font-medium mb-2 group-hover:text-[#34C759] transition-colors">Check-in</span>
                                                    <span className="text-lg font-black text-[#18230F]">{selectedDateRange?.from ? format(selectedDateRange.from, 'MMM d, yyyy') : 'Select date'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden" align="start">
                                                <CalendarPicker mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} disabled={(d) => d < new Date()} />
                                            </PopoverContent>
                                        </Popover>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="flex flex-col items-start p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-[#34C759]/40 hover:bg-white transition-all text-left group shadow-sm">
                                                    <span className="text-xs text-gray-400 font-medium mb-2 group-hover:text-[#34C759] transition-colors">Check-out</span>
                                                    <span className="text-lg font-black text-[#18230F]">{selectedDateRange?.to ? format(selectedDateRange.to, 'MMM d, yyyy') : 'Select date'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden" align="start">
                                                <CalendarPicker mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} disabled={(d) => d < new Date()} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-gray-400 font-medium mb-3 block px-1">Guests</Label>
                                        <Select value={String(numGuests)} onValueChange={val => setNumGuests(Number(val))}>
                                            <SelectTrigger className="w-full h-[64px] bg-gray-50 border-transparent rounded-2xl text-[#18230F] font-black px-6 hover:border-[#34C759]/40 hover:bg-white transition-all shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <Users className="w-5 h-5 text-[#34C759]" />
                                                    <span className="text-lg">{numGuests} Guest{numGuests > 1 ? 's' : ''}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                                                {[...Array(maximum_capacity || 6)].map((_, i) => (
                                                    <SelectItem key={i + 1} value={String(i + 1)} className="font-bold py-3 hover:bg-emerald-50 focus:bg-emerald-50">{i + 1} Guest{i > 0 ? 's' : ''}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {numGuests > (Number(optimal_capacity) || 2) && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-amber-600 font-black text-sm">!</span>
                                                </div>
                                                <p className="text-sm text-amber-900 leading-relaxed font-medium">
                                                    For {numGuests} guests, an extra bed will be made in the living room table area.
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between">
                                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                                        <div className="p-6 md:p-7 space-y-4">
                                            {bookingCost ? (
                                                <>
                                                    {bookingCost.weekdayNights > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 font-medium text-[10px] tracking-widest">{bookingCost.weekdayNights} × €{bookingCost.weekdayPrice} Weekday</span>
                                                            <span className="font-black text-[#18230F]">€{bookingCost.weekdayNights * bookingCost.weekdayPrice}</span>
                                                        </div>
                                                    )}
                                                    {bookingCost.weekendNights > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 font-medium text-[10px] tracking-widest">{bookingCost.weekendNights} × €{bookingCost.weekendPrice} Weekend</span>
                                                            <span className="font-black text-[#18230F]">€{bookingCost.weekendNights * bookingCost.weekendPrice}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                                        <span className="text-gray-400 font-medium text-[10px] tracking-widest">Prep & taxes</span>
                                                        <span className="font-black text-[#18230F]">€{bookingCost.preparationFee}</span>
                                                    </div>
                                                    {bookingCost.extrasTotal > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 font-medium text-[10px] tracking-widest">Extras</span>
                                                            <span className="font-black text-[#34C759]">+{bookingCost.extrasTotal}€</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="py-12 text-center bg-gray-50/50 border border-dashed border-gray-100 rounded-3xl">
                                                    <CalendarDays className="w-10 h-10 mx-auto text-gray-200 mb-3 stroke-[1.5]" />
                                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Select dates to calculate price</p>
                                                </div>
                                            )}
                                        </div>

                                        {bookingCost && (
                                            <div className="bg-[#18230F] p-6 md:p-7">
                                                <div className="flex justify-between items-end text-white mb-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] tracking-[0.2em] font-medium opacity-50 mb-1">Total amount</span>
                                                        <span className="font-black text-4xl">€{bookingCost.total}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl py-3 px-4 text-center">
                                                    <p className="text-[10px] text-[#34C759] font-black uppercase tracking-widest">SECURE WITH MINI. €{bookingCost.deposit} DEPOSIT (30%)</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8">
                                        <Button
                                            onClick={handleRequestBooking}
                                            className="w-full h-12 md:h-14 font-display text-lg md:text-xl font-bold rounded-full bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                                            disabled={!selectedDateRange?.from || !selectedDateRange?.to}
                                        >
                                            {isSubmitting ? "Processing..." : "Request a Reservation"}
                                        </Button>
                                        <div className="flex items-center justify-center gap-2 mt-5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-center text-[10px] text-gray-400 font-medium tracking-widest">No charge until confirmation • Free cancellation</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapsed Bar - Always Visible */}
                <div className="bg-white border-t border-gray-100 px-6 md:px-12 lg:px-20 py-3 md:py-4 shadow-[0_-15px_50px_rgba(0,0,0,0.08)] relative z-10">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        {/* Left Side: Segments */}
                        <div className="flex items-center gap-8 lg:gap-12">
                            <h4 className="font-display text-2xl md:text-3xl font-bold text-[#18230F] whitespace-nowrap tracking-tight leading-tight">{name}</h4>

                            <div className="h-12 w-px bg-gray-100 hidden sm:block" />

                            <div className="hidden sm:flex flex-col group cursor-pointer" onClick={() => setIsBookBarExpanded(true)}>
                                <span className="text-sm text-gray-500 font-medium mb-1 group-hover:text-[#34C759] transition-colors">Dates</span>
                                <span className="text-base font-black text-[#18230F] whitespace-nowrap">
                                    {selectedDateRange?.from ? format(selectedDateRange.from, 'MMM d') : 'Add dates'}
                                    {selectedDateRange?.to ? ` - ${format(selectedDateRange.to, 'MMM d')}` : ''}
                                </span>
                            </div>

                            <div className="h-12 w-px bg-gray-100 hidden md:block" />

                            <div className="hidden md:flex flex-col group cursor-pointer" onClick={() => setIsBookBarExpanded(true)}>
                                <span className="text-sm text-gray-500 font-medium mb-1 group-hover:text-[#34C759] transition-colors">Guests</span>
                                <span className="text-base font-black text-[#18230F] whitespace-nowrap">
                                    {numGuests} Guest{numGuests > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Right Side: Total & Button */}
                        <div className="flex items-center gap-8 lg:gap-12">
                            <div className="flex flex-col items-end">
                                <span className="text-2xl md:text-4xl font-black text-[#18230F]">
                                    {bookingCost ? `${bookingCost.total}€` : (houseboat?.starting_price ? `${houseboat.starting_price}€` : '150€')}
                                </span>
                                <button
                                    onClick={() => setIsBookBarExpanded(!isBookBarExpanded)}
                                    className="text-xs font-black text-[#34C759] hover:text-[#2DA64D] hover:underline transition-all cursor-pointer mt-0.5"
                                >
                                    {isBookBarExpanded ? 'Hide info' : 'Detailed price'}
                                </button>
                            </div>

                            <Button
                                onClick={handleRequestBooking}
                                className="h-12 md:h-14 px-8 md:px-12 font-display text-lg md:text-xl font-bold rounded-full bg-[#34C759] hover:bg-[#2DA64D] text-[#18230F] shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] shrink-0"
                                disabled={!selectedDateRange?.from || !selectedDateRange?.to}
                            >
                                Request Reservation
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function HouseboatDetailSkeleton() {
    return (
        <div className="min-h-screen pt-20 container mx-auto px-4 max-w-7xl">
            <div className="space-y-4 mb-8">
                <Skeleton className="aspect-[16/9] rounded-2xl" />
                <div className="grid grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
                <Skeleton className="h-[200px] rounded-2xl" />
                <Skeleton className="h-[200px] rounded-2xl" />
            </div>
        </div>
    );
}

export default function HouseboatDetail({ slug }: HouseboatDetailProps) {
    return <Suspense fallback={<HouseboatDetailSkeleton />}><HouseboatDetailContent slug={slug} /></Suspense>;
}
