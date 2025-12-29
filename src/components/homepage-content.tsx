'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import {
    Ship,
    Star,
    Users,
    Utensils,
    Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/components/providers/supabase-provider';
import type { HouseboatModel } from '@/lib/data-firestore';
import FeaturedHouseboatCard from './featured-houseboat-card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from './ui/carousel';
import Link from 'next/link';
import ReservationForm from './reservation-form';
import RestaurantReservationForm from './restaurant-reservation-form';
import { WavyDivider } from '@/components/ui/wavy-divider';
import { LicenseBadge } from '@/components/license-badge';

type WebsiteSettings = {
    heroImageUrl?: string;
};

type Testimonial = {
    id: string;
    name: string;
    quote: string;
    rating: number;
};

type SearchTab = 'houseboat' | 'restaurant' | 'daily trip';

export default function HomePageContent({ dictionary }: { dictionary: any }) {
    const [activeTab, setActiveTab] = useState<SearchTab>('houseboat');
    const { supabase } = useSupabase();

    const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
    const [featuredHouseboats, setFeaturedHouseboats] = useState<(HouseboatModel & { startingPrice?: number })[]>([]);
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);

    // Fetch Website Settings
    useEffect(() => {
        const fetchSettings = async () => {
            if (!supabase) return;
            const { data } = await supabase
                .from('site_settings')
                .select('*')
                .eq('key', 'main')
                .single();

            if (data && data.data) {
                setWebsiteSettings(data.data as WebsiteSettings);
            }
        };
        fetchSettings();
    }, [supabase]);

    // Fetch Houseboats with Prices
    useEffect(() => {
        const fetchHouseboats = async () => {
            if (!supabase) return;
            setIsLoadingModels(true);

            try {
                const { data: models, error: modelsError } = await supabase
                    .from('houseboat_models')
                    .select('*');

                if (modelsError) throw modelsError;

                const { data: prices, error: pricesError } = await supabase
                    .from('houseboat_prices')
                    .select('*');

                if (pricesError) console.error("Error fetching prices:", pricesError);

                const processedModels = (models || []).map((model: any) => {
                    const modelPrices = (prices || []).filter((p: any) => p.model_id === model.id);

                    let startingPrice: number | undefined = undefined;
                    if (modelPrices.length > 0) {
                        const weekdays = modelPrices.map((p: any) => Number(p.weekday_price || 0)).filter((p: number) => p > 0);
                        if (weekdays.length > 0) {
                            startingPrice = Math.min(...weekdays);
                        }
                    }

                    return {
                        ...model,
                        // Map Supabase fields to standard camelCase expected by components
                        id: model.id,
                        name: model.name,
                        description: model.description,
                        // Supabase uses `image_urls`, component expects `imageUrls` or `images`
                        imageUrls: model.image_urls || [],
                        images: model.image_urls || [],
                        optimalCapacity: model.optimal_capacity,
                        maximumCapacity: model.maximum_capacity,
                        // Fallbacks
                        capacity: model.maximum_capacity || model.capacity,
                        slug: model.slug,
                        startingPrice
                    };
                });

                setFeaturedHouseboats(processedModels);
            } catch (error) {
                console.error("Error fetching houseboats:", error);
            } finally {
                setIsLoadingModels(false);
            }
        };

        fetchHouseboats();
    }, [supabase]);

    // Fetch Testimonials
    useEffect(() => {
        const fetchTestimonials = async () => {
            if (!supabase) return;
            setIsLoadingTestimonials(true);
            try {
                const { data } = await supabase.from('testimonials').select('*');
                setTestimonials((data as Testimonial[]) || []);
            } catch (error) {
                console.error("Error fetching testimonials:", error);
            } finally {
                setIsLoadingTestimonials(false);
            }
        };

        fetchTestimonials();
    }, [supabase]);

    const isLoading = isLoadingModels;

    return (
        <div className="flex flex-col bg-white">

            {/* MERGED HERO SECTION */}
            {/* Reduced padding: pt-20 (shifter up) pb-12 (tight bottom) */}
            <section className="relative flex items-center pt-20 pb-12 overflow-hidden min-h-[90vh]">
                {websiteSettings?.heroImageUrl ? (
                    <>
                        <Image
                            src={websiteSettings.heroImageUrl}
                            alt="Houseboat Experience"
                            fill
                            className="object-cover"
                            priority
                            quality={95}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#010a1f]/90 via-[#010a1f]/40 to-[#010a1f]/70" />
                        <div className="absolute inset-0 bg-black/20" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-[#010a1f]" />
                )}

                <div className="container max-w-7xl mx-auto px-4 relative z-10 w-full mb-4">
                    <div className="flex flex-col items-center">

                        <div className="text-center mb-6 text-white max-w-5xl mx-auto mt-2 flex flex-col items-center">

                            {/* Badge */}
                            <div className="mb-2 transform scale-105">
                                <LicenseBadge />
                            </div>

                            {/* Title with Gradient - BALANCED SIZE (7xl) */}
                            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight leading-tight text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                Your Escape to <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-400 to-green-500 filter drop-shadow-[0_0_25px_rgba(34,197,94,0.5)]">
                                    Serenity
                                </span>
                            </h1>

                            {/* Decorative Separator & Editorial Paragraph */}
                            <div className="flex flex-col items-center mt-2">
                                <p className="text-xl md:text-2xl text-white font-medium max-w-3xl mx-auto drop-shadow-md leading-relaxed tracking-wide">
                                    Experience the freedom of <span className="font-bold text-white decoration-green-500/80 underline decoration-4 underline-offset-4">Europe's largest reservoir</span>
                                </p>
                            </div>
                        </div>

                        {/* SEARCH CONTAINER - Compact */}
                        <div className="w-full max-w-4xl relative z-20 flex flex-col items-center mt-2">

                            {/* 1. FLOATING TABS - Smaller, Compact */}
                            <div className="flex justify-center mb-3">
                                <div className="bg-black/40 backdrop-blur-xl rounded-full p-1.5 border border-white/20 shadow-2xl inline-flex gap-2">
                                    {[
                                        { id: 'houseboat', label: 'Houseboats', icon: Ship },
                                        { id: 'restaurant', label: 'Restaurant', icon: Utensils },
                                        { id: 'daily trip', label: 'Daily Trips', icon: Compass }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as SearchTab)}
                                            className={cn(
                                                "flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
                                                activeTab === tab.id
                                                    ? "bg-white text-gray-900 shadow-lg scale-105"
                                                    : "text-white/90 hover:bg-white/20 hover:text-white"
                                            )}
                                        >
                                            <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-green-600" : "text-white/90")} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. UNIFIED SEARCH BAR - Compact Height (h-16) */}
                            <div className="w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] rounded-[2.5rem] bg-white transition-all transform hover:scale-[1.01] duration-500 border border-white/10">

                                {activeTab === 'houseboat' && (
                                    <div className="w-full h-16">
                                        <ReservationForm />
                                    </div>
                                )}

                                {activeTab === 'restaurant' && (
                                    <div className="p-1 h-16 flex items-center justify-center">
                                        <RestaurantReservationForm dictionary={dictionary.restaurant} />
                                    </div>
                                )}

                                {activeTab === 'daily trip' && (
                                    <div className="h-16 flex items-center justify-between px-8">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900">Explore Alqueva by Day</h3>
                                        </div>
                                        <Button asChild size="sm" className="rounded-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 shadow-md">
                                            <Link href="/daily-travel">View Options</Link>
                                        </Button>
                                    </div>
                                )}

                            </div>

                        </div>

                    </div>
                </div>
            </section>

            {/* Featured Fleet Section */}
            <section className="bg-white py-12 lg:py-20 relative">
                <div className="container mx-auto max-w-7xl px-4 relative z-10">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight text-[#010a1f]">
                            Our Featured Fleet
                        </h2>
                        <div className="w-20 h-1.5 bg-green-500 mx-auto mb-4 rounded-full" />
                        <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed font-medium">
                            Discover our premium houseboats.
                        </p>
                    </div>

                    <div>
                        <Carousel
                            opts={{ align: 'start', loop: true }}
                            className="w-full"
                        >
                            <CarouselContent className="-ml-6 lg:-ml-8 pb-10">
                                {isLoading ? (
                                    [...Array(2)].map((_, i) => (
                                        <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/2 pl-6 lg:pl-8">
                                            <div className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse border border-gray-100">
                                                <div className="h-48 bg-gray-200"></div>
                                                <div className="p-4 space-y-3">
                                                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))
                                ) : (
                                    featuredHouseboats?.map(boat => (
                                        <CarouselItem key={boat.id} className="md:basis-1/2 lg:basis-1/2 pl-6 lg:pl-8">
                                            <div className="h-full transform hover:-translate-y-2 transition-transform duration-300">
                                                <div className="h-full">
                                                    <FeaturedHouseboatCard houseboat={boat} dictionary={dictionary.houseboat} />
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))
                                )}
                            </CarouselContent>
                            <div className="flex justify-center mt-2 gap-4">
                                <CarouselPrevious className="static translate-x-0 translate-y-0 bg-white hover:bg-green-600 hover:text-white border-2 border-gray-200 hover:border-green-600 rounded-full h-12 w-12 shadow-sm transition-all" />
                                <CarouselNext className="static translate-x-0 translate-y-0 bg-white hover:bg-green-600 hover:text-white border-2 border-gray-200 hover:border-green-600 rounded-full h-12 w-12 shadow-sm transition-all" />
                            </div>
                        </Carousel>
                    </div>
                </div>
                <div className="h-px bg-gray-100 mt-12 mb-12 w-full max-w-7xl mx-auto" />
            </section>

            {/* TESTIMONIALS - Compact */}
            <section className="bg-white pb-20">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="lg:pr-8">
                            <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight text-[#010a1f]">
                                Discover the Heart of Alqueva
                            </h2>
                            <div className="w-20 h-1.5 bg-green-500 mb-6 rounded-full" />
                            <p className="text-lg font-medium leading-relaxed mb-8 text-gray-600">
                                Immerse yourself in a landscape of serene waters and star-filled skies.
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-slate-50 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="text-3xl font-black text-green-600 mb-1">50+</div>
                                    <div className="text-xs font-bold text-gray-900 uppercase">Boats</div>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="text-3xl font-black text-green-600 mb-1">4.9</div>
                                    <div className="text-xs font-bold text-gray-900 uppercase">Rating</div>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="text-3xl font-black text-green-600 mb-1">1k+</div>
                                    <div className="text-xs font-bold text-gray-900 uppercase">Guests</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <Carousel opts={{ align: 'start', loop: true }}>
                                <CarouselContent>
                                    {isLoadingTestimonials ? (
                                        <p className="text-center py-8">Loading testimonials...</p>
                                    ) : testimonials && testimonials.length > 0 ? (
                                        testimonials.map(testimonial => (
                                            <CarouselItem key={testimonial.id}>
                                                <div className="bg-slate-50 border border-gray-100 rounded-[2rem] p-8 shadow-lg relative mt-2 mx-2 mb-4">
                                                    <p className="text-lg font-medium italic mb-6 leading-relaxed text-gray-800 relative z-10">
                                                        "{testimonial.quote}"
                                                    </p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md">
                                                            {testimonial.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-base text-gray-900">{testimonial.name}</p>
                                                            <div className="flex items-center gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} className={`h-3 w-3 ${i < testimonial.rating ? 'text-green-500 fill-green-500' : 'text-gray-300'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CarouselItem>
                                        ))
                                    ) : (
                                        <CarouselItem>
                                            <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 text-center">
                                                <p className="font-medium text-gray-600">No testimonials yet</p>
                                            </div>
                                        </CarouselItem>
                                    )}
                                </CarouselContent>
                                <div className="flex justify-center mt-2 gap-3">
                                    <CarouselPrevious className="static translate-x-0 translate-y-0 bg-white hover:bg-green-600 hover:text-white border-2 border-gray-200 hover:border-green-600 rounded-full h-10 w-10 shadow-sm transition-all" />
                                    <CarouselNext className="static translate-x-0 translate-y-0 bg-white hover:bg-green-600 hover:text-white border-2 border-gray-200 hover:border-green-600 rounded-full h-12 w-12 shadow-sm transition-all" />
                                </div>
                            </Carousel>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
