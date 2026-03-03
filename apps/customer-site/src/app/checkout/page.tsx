'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseISO, format } from 'date-fns';
import { HouseboatModel } from '@/lib/types';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { CheckoutForm, OrderSummary, useCheckoutPricingContract } from '@/features/checkout';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAppContext } from '@/components/app-layout';
import { parseCheckoutParams } from '@/lib/checkout/params';
import { CheckoutLoadingSkeleton } from '@/components/loading/public-page-skeletons';

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const { supabase } = useSupabase();
    const { websiteSettings, locale } = useAppContext();

    const checkoutParams = useMemo(() => parseCheckoutParams(searchParams), [searchParams]);
    const {
        boatId,
        offerId,
        packageId,
        mode,
        from: fromStr,
        to: toStr,
        date: dateStr,
        time: timeStr,
        guests,
        adults,
        children: childrenCount,
        seniors,
        selectedExtraIds,
        menuSelectionsRaw,
        bookingType,
    } = checkoutParams;

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [needsInvoice, setNeedsInvoice] = useState(false);

    // Data
    const [boat, setBoat] = useState<HouseboatModel | null>(null);
    const [offer, setOffer] = useState<any | null>(null); // For Combo Offers
    const [riverCruisePackage, setRiverCruisePackage] = useState<any | null>(null); // For River Cruise
    const [allMenus, setAllMenus] = useState<any[]>([]); // For River Cruise Menus
    const [prices, setPrices] = useState<any[]>([]);
    const [extras, setExtras] = useState<any[]>([]);

    // Form State
    const [clientDetails, setClientDetails] = useState<{ name: string; email: string; phone: string; nif?: string; address?: string }>({ name: '', email: '', phone: '' });
    const [checkInTime, setCheckInTime] = useState<string>('');
    const [selectedExtras, setSelectedExtras] = useState<string[]>(() => {
        return selectedExtraIds;
    });

    // Derived State
    const dates = {
        from: (mode === 'combo' || mode === 'river-cruise') && dateStr ? parseISO(dateStr) : (fromStr ? parseISO(fromStr) : new Date()),
        to: (mode === 'combo' || mode === 'river-cruise') && dateStr ? parseISO(dateStr) : (toStr ? parseISO(toStr) : new Date()),
    };

    const totalSpecificGuests = adults + childrenCount + seniors;

    // Menu Selections Parsing
    const menuSelections = useMemo(() => {
        if (!menuSelectionsRaw) return [];
        try {
            return JSON.parse(menuSelectionsRaw);
        } catch (e) {
            console.error("Failed to parse menu selections", e);
            return [];
        }
    }, [menuSelectionsRaw]);

    useEffect(() => {
        if (user) {
            setClientDetails({
                name: user.user_metadata?.username || user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: ''
            });
        }
    }, [user]);

    // Initialize check-in time for combo/cruise offers
    useEffect(() => {
        if ((mode === 'combo' || mode === 'river-cruise') && timeStr && !checkInTime) {
            setCheckInTime(timeStr);
        }
    }, [mode, timeStr, checkInTime]);

    useEffect(() => {
        async function fetchCheckoutData() {
            if (!boatId && !offerId && !packageId) return;
            setIsLoading(true);
            try {
                // Fetch Extras (only for houseboats and combos)
                if (mode !== 'river-cruise') {
                    const extrasRes = await supabase.from('extras').select('*').in('type', ['all', 'houseboat']);
                    if (extrasRes.data) setExtras(extrasRes.data);
                }

                if (mode === 'river-cruise' && packageId) {
                    // Fetch River Cruise Data
                    const [pkgRes, menusRes, poolRes] = await Promise.all([
                        supabase.from('daily_travel_packages').select('*').eq('id', packageId).single(),
                        supabase.from('restaurant_menus').select('*').eq('is_active', true),
                        supabase.from('package_boats').select('*, daily_boats(photo_url)').eq('package_id', packageId)
                    ]);

                    if (pkgRes.data) {
                        let photoUrl = pkgRes.data.photo_url;
                        if (!photoUrl && poolRes.data && poolRes.data.length > 0) {
                            photoUrl = poolRes.data[0]?.daily_boats?.photo_url;
                        }

                        setRiverCruisePackage({
                            ...pkgRes.data,
                            photo_url: photoUrl
                        });
                    }
                    if (menusRes.data) setAllMenus(menusRes.data);

                    if (offerId) { // Check if there's a linked offer for discount
                        const { data: offerData } = await supabase.from('special_offers').select('*').eq('id', offerId).single();
                        if (offerData) setOffer(offerData);
                    }

                } else if (mode === 'combo' && offerId) {
                    // Fetch Offer Data
                    const { data: offerData, error } = await supabase
                        .from('special_offers')
                        .select('*')
                        .eq('id', offerId)
                        .single();

                    if (error) throw error;
                    if (offerData) setOffer(offerData);
                } else if (boatId) {
                    // Fetch Houseboat Data
                    const [boatRes, pricesRes] = await Promise.all([
                        supabase.from('houseboat_models').select('*').eq('id', boatId).single(),
                        supabase.from('houseboat_prices').select('*').eq('model_id', boatId),
                    ]);

                    if (boatRes.data) {
                        setBoat({
                            ...boatRes.data,
                            optimalCapacity: boatRes.data.optimal_capacity,
                            maximumCapacity: boatRes.data.maximum_capacity,
                            imageUrls: boatRes.data.image_urls || []
                        } as HouseboatModel);
                    }
                    if (pricesRes.data) setPrices(pricesRes.data);
                }
            } catch (error) {
                console.error("Error fetching checkout data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCheckoutData();
    }, [boatId, offerId, packageId, mode, supabase]);

    // Auto-set checkin time for day charter
    useEffect(() => {
        if (mode === 'houseboat' && bookingType === 'day_charter' && !checkInTime) {
            setCheckInTime('09:00');
        }
    }, [bookingType, checkInTime, mode]);

    const { priceBreakdown, selectedExtrasList } = useCheckoutPricingContract({
        mode: mode as 'houseboat' | 'combo' | 'river-cruise',
        offer,
        riverCruisePackage,
        adults,
        childrenCount,
        seniors,
        menuSelections,
        allMenus,
        boat,
        prices,
        dates,
        bookingType,
        selectedExtras,
        extras,
    });

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            if (mode === 'river-cruise' && riverCruisePackage) {
                // RIVER CRUISE FLOW

                // 1. Create Booking
                const bookingRes = await fetch('/api/river-cruise/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        packageId: riverCruisePackage.id,
                        date: format(dates.from, 'yyyy-MM-dd'),
                        time: checkInTime,
                        adults,
                        children: childrenCount,
                        seniors,
                        clientName: clientDetails.name,
                        clientEmail: clientDetails.email,
                        clientPhone: clientDetails.phone,
                        clientNif: needsInvoice ? clientDetails.nif : '',
                        clientAddress: needsInvoice ? clientDetails.address : '',
                        withFood: menuSelections.length > 0,
                        selectedAddons: [], // Addons not yet in URL/UI
                        menuSelections: menuSelections
                    })
                });

                const bookingData = await bookingRes.json();
                if (bookingData.error) throw new Error(bookingData.error);
                const bookingId = bookingData.bookingId;

                // 2. Create Checkout Session
                const checkoutRes = await fetch('/api/river-cruise/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId,
                        totalPrice: priceBreakdown.total,
                        depositAmount: priceBreakdown.deposit,
                        packageName: riverCruisePackage.name,
                        clientName: clientDetails.name,
                        clientEmail: clientDetails.email,
                        clientPhone: clientDetails.phone,
                        clientNif: needsInvoice ? clientDetails.nif : '',
                        clientAddress: needsInvoice ? clientDetails.address : '',
                        date: format(dates.from, 'yyyy-MM-dd'),
                        time: checkInTime,
                        durationHours: riverCruisePackage.duration_hours,
                        adults,
                        children: childrenCount,
                        seniors,
                        offerId: offer?.id || '',
                        offerTitle: offer?.title || '',
                        paymentOption: 'deposit'
                    })
                });

                const checkoutData = await checkoutRes.json();
                if (checkoutData.error) throw new Error(checkoutData.error);

                if (checkoutData.url) {
                    window.location.href = checkoutData.url;
                } else {
                    throw new Error('No checkout URL received');
                }

            } else if (mode === 'combo' && offer) {
                // COMBO FLOW: create booking -> checkout
                if (!offer.linked_package_id) throw new Error("Linked package not found for this offer.");

                // 1. Create Booking
                const bookingRes = await fetch('/api/river-cruise/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        packageId: offer.linked_package_id,
                        date: format(dates.from, 'yyyy-MM-dd'),
                        time: checkInTime,
                        adults,
                        children: childrenCount,
                        seniors,
                        // Flattened Client Details for API
                        clientName: clientDetails.name,
                        clientEmail: clientDetails.email,
                        clientPhone: clientDetails.phone,
                        clientNif: needsInvoice ? clientDetails.nif : '',
                        clientAddress: needsInvoice ? clientDetails.address : '',
                        withFood: true // Default for combo offers
                    })
                });

                const bookingData = await bookingRes.json();
                if (bookingData.error) throw new Error(bookingData.error);
                const bookingId = bookingData.bookingId; // Correct property name

                // 2. Create Checkout Session
                const checkoutRes = await fetch('/api/river-cruise/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId,
                        totalPrice: priceBreakdown.total,
                        // Pass details for Stripe Metadata
                        packageName: offer.title,
                        clientName: clientDetails.name,
                        clientEmail: clientDetails.email,
                        clientPhone: clientDetails.phone,
                        clientNif: needsInvoice ? clientDetails.nif : '',
                        clientAddress: needsInvoice ? clientDetails.address : '',
                        date: format(dates.from, 'yyyy-MM-dd'),
                        time: checkInTime,
                        adults,
                        children: childrenCount,
                        seniors,
                        offerId: offer.id,
                        offerTitle: offer.title
                    })
                });

                const checkoutData = await checkoutRes.json();
                if (checkoutData.error) throw new Error(checkoutData.error);

                if (checkoutData.url) {
                    window.location.href = checkoutData.url;
                } else {
                    throw new Error('No checkout URL received');
                }

            } else if (boatId) {
                // HOUSEBOAT FLOW (Existing)
                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dates: dates,
                        houseboatId: boatId,
                        houseboatName: boat?.name,
                        clientDetails,
                        totalPrice: priceBreakdown.total,
                        numberOfGuests: guests,
                        checkInTime,
                        selectedExtras,
                        bookingType,
                        paymentOption: 'deposit', // Explicitly set default
                        billingNif: needsInvoice ? clientDetails.nif : '',
                        billingAddress: needsInvoice ? clientDetails.address : ''
                    }),
                });

                const { url, error } = await response.json();
                if (error) throw new Error(error);

                if (url) {
                    window.location.href = url;
                } else {
                    throw new Error('No checkout URL received');
                }
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Checkout Failed',
                description: error.message || 'Please try again.'
            });
            setIsSubmitting(false);
        }
    };

    if ((!boatId && !offerId && !packageId) || (!isLoading && !boat && !offer && !riverCruisePackage)) {
        return (
            <div className="min-h-screen pt-20 flex flex-col items-center justify-center p-4">
                <h1 className="text-xl font-bold mb-4">Invalid Booking Request</h1>
                <Button onClick={() => router.push('/')}>Return Home</Button>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Standard Header */}
            <header className="bg-white border-b border-gray-100 py-3 sticky top-0 z-50">
                <div className="container mx-auto px-4 max-w-6xl flex items-center h-12 relative">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-500 hover:text-[#18230F] -ml-2 font-medium flex items-center gap-2 z-10">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back</span>
                    </Button>

                    <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                        {websiteSettings?.logoUrl ? (
                            <Image
                                src={websiteSettings.logoUrl}
                                alt={websiteSettings?.companyName || "Amieira Marina"}
                                width={180}
                                height={60}
                                priority
                                className="h-10 w-auto object-contain"
                            />
                        ) : (
                            <span className="text-xl font-bold text-[#18230F]">
                                {websiteSettings?.companyName || "Amieira Marina"}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="container mx-auto max-w-6xl px-4 py-12">
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left Column: Form (8 cols) */}
                    <div className="lg:col-span-8">
                        <div className="mb-8">
                            <h1 className="text-4xl font-display text-[#18230F] tracking-tight">
                                Finalize Your {mode === 'combo' ? 'Booking' : (mode === 'river-cruise' ? 'Cruise' : 'Stay')}
                            </h1>
                            <p className="text-gray-500 mt-2 text-base">Please provide your details below to secure your {mode === 'combo' ? 'spot' : (mode === 'river-cruise' ? 'excursion' : 'houseboat stay')}.</p>
                        </div>
                        <CheckoutForm
                            clientDetails={clientDetails}
                            setClientDetails={setClientDetails}
                            checkInTime={checkInTime}
                            setCheckInTime={setCheckInTime}
                            extras={extras}
                            selectedExtras={selectedExtras}
                            onToggleExtra={(id) => {
                                setSelectedExtras(prev =>
                                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                );
                            }}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            bookingType={bookingType}
                            mode={mode as any}
                            needsInvoice={needsInvoice}
                            setNeedsInvoice={setNeedsInvoice}
                            locale={locale}
                        />
                    </div>

                    {/* Right Column: Summary (4 cols) */}
                    <div className="lg:col-span-4 sticky top-24">
                        {(isLoading || boat || offer || riverCruisePackage) && (
                            <OrderSummary
                                boat={boat as HouseboatModel}
                                offer={offer}
                                riverCruisePackage={riverCruisePackage}
                                dates={dates}
                                guests={mode === 'combo' || mode === 'river-cruise' ? totalSpecificGuests : guests}
                                priceBreakdown={priceBreakdown}
                                extras={selectedExtrasList as any}
                                loading={isLoading}
                                checkInTime={checkInTime}
                                bookingType={bookingType}
                                mode={mode as any}
                                locale={locale}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<CheckoutLoadingSkeleton />}>
            <CheckoutContent />
        </Suspense>
    );
}
