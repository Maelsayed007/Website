'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseISO, differenceInCalendarDays, eachDayOfInterval, getDay } from 'date-fns';
import { HouseboatModel } from '@/lib/types';
import { useAuth } from '@/components/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { OrderSummary } from '@/components/checkout/order-summary';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAppContext } from '@/components/app-layout';

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const supabase = createClient();
    const { websiteSettings } = useAppContext();

    // Query Params
    const boatId = searchParams.get('boatId');
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const guestsStr = searchParams.get('guests');
    const extrasStr = searchParams.get('extras');

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data
    const [boat, setBoat] = useState<HouseboatModel | null>(null);
    const [prices, setPrices] = useState<any[]>([]);
    const [extras, setExtras] = useState<any[]>([]);

    // Form State
    const [clientDetails, setClientDetails] = useState({ name: '', email: '', phone: '' });
    const [checkInTime, setCheckInTime] = useState<string>('');
    const [selectedExtras, setSelectedExtras] = useState<string[]>(() => {
        if (extrasStr) {
            return extrasStr.split(',').filter(Boolean);
        }
        return [];
    });

    // Derived State
    const dates = {
        from: fromStr ? parseISO(fromStr) : new Date(),
        to: toStr ? parseISO(toStr) : new Date(),
    };
    const guests = parseInt(guestsStr || '2');

    useEffect(() => {
        if (user) {
            setClientDetails({
                name: user.user_metadata?.username || user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: ''
            });
        }
    }, [user]);

    useEffect(() => {
        async function fetchCheckoutData() {
            if (!boatId) return;
            setIsLoading(true);
            try {
                const [boatRes, pricesRes, extrasRes] = await Promise.all([
                    supabase.from('houseboat_models').select('*').eq('id', boatId).single(),
                    supabase.from('houseboat_prices').select('*').eq('model_id', boatId),
                    supabase.from('extras').select('*').in('type', ['all', 'houseboat'])
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
                if (extrasRes.data) setExtras(extrasRes.data);
            } catch (error) {
                console.error("Error fetching checkout data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCheckoutData();
    }, [boatId, supabase]);

    // Price Calculation
    const calculatePrice = () => {
        if (!prices.length) return {
            weekdayNights: 0, weekdayPrice: 0, weekendNights: 0, weekendPrice: 0,
            preparationFee: 0, extrasTotal: 0, total: 0, deposit: 0
        };

        const priceObj = prices[0];
        const nights = Math.max(0, differenceInCalendarDays(dates.to, dates.from));

        let weekdayCount = 0, weekendCount = 0;

        if (nights > 0) {
            eachDayOfInterval({ start: dates.from, end: dates.to }).slice(0, -1).forEach(d => {
                const day = getDay(d);
                if (day === 5 || day === 6) weekendCount++; else weekdayCount++;
            });
        }

        const preparationFee = 76;
        let extrasTotal = 0;
        const selectedExtrasDetails = selectedExtras.map(id => {
            const extra = extras.find(e => e.id === id);
            if (extra) {
                const cost = extra.price_type === 'per_day' ? extra.price * nights : extra.price;
                extrasTotal += cost;
                return { ...extra, cost };
            }
            return null;
        }).filter(Boolean);

        const total = (weekdayCount * priceObj.weekday_price) + (weekendCount * priceObj.weekend_price) + preparationFee + extrasTotal;

        return {
            weekdayNights: weekdayCount,
            weekdayPrice: priceObj.weekday_price,
            weekendNights: weekendCount,
            weekendPrice: priceObj.weekend_price,
            preparationFee,
            extrasTotal,
            total,
            deposit: Math.ceil(total * 0.3)
        };
    };

    const priceBreakdown = calculatePrice();
    const selectedExtrasList = selectedExtras.map(id => {
        const extra = extras.find(e => e.id === id);
        return extra ? { ...extra, quantity: 1 } : null;
    }).filter(Boolean);

    const handleSubmit = async () => {
        if (!boatId) return;
        setIsSubmitting(true);

        try {
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
                    checkInTime, // New Field
                    selectedExtras // New Field
                }),
            });

            const { url, error } = await response.json();
            if (error) throw new Error(error);

            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL received');
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

    if (!boatId || (!isLoading && !boat)) {
        return (
            <div className="min-h-screen pt-20 flex flex-col items-center justify-center p-4">
                <h1 className="text-xl font-bold mb-4">Invalid Booking Request</h1>
                <Button onClick={() => router.push('/houseboats')}>Return to Houseboats</Button>
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
                                Finalize Your Stay
                            </h1>
                            <p className="text-gray-500 mt-2 text-base">Please provide your details below to secure your houseboat stay.</p>
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
                        />
                    </div>

                    {/* Right Column: Summary (4 cols) */}
                    <div className="lg:col-span-4 sticky top-24">
                        {boat && (
                            <OrderSummary
                                boat={boat}
                                dates={dates}
                                guests={guests}
                                priceBreakdown={priceBreakdown}
                                extras={selectedExtrasList as any}
                                loading={isLoading}
                                checkInTime={checkInTime}
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
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#18230F]"></div></div>}>
            <CheckoutContent />
        </Suspense>
    );
}
