'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useAppContext } from '@/components/app-layout';
import type { HouseboatModel } from '@/lib/data-firestore';
import FeaturedHouseboatCard from './featured-houseboat-card';
import ReservationForm from './reservation-form';

type Testimonial = {
    id: string;
    name: string;
    quote: string;
    rating: number;
};

interface HomePageContentProps {
    dictionary: any;
}

export default function HomePageContent({ dictionary }: HomePageContentProps) {
    const { supabase } = useSupabase();
    const { activeTab, websiteSettings } = useAppContext();

    const [featuredHouseboats, setFeaturedHouseboats] = useState<(HouseboatModel & { startingPrice?: number })[]>([]);
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);

    // Carousel State
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            // Check initially
            checkScroll();
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            if (container) container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [featuredHouseboats, isLoadingModels]); // Re-check when data loads

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 350;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            // checkScroll will be triggered by the scroll event
        }
    };

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
                        id: model.id,
                        name: model.name,
                        description: model.description,
                        imageUrls: model.image_urls || [],
                        images: model.image_urls || [],
                        optimalCapacity: model.optimal_capacity,
                        maximumCapacity: model.maximum_capacity,
                        capacity: model.maximum_capacity || model.capacity,
                        bedrooms: model.bedrooms,
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

    // Get page title based on active tab
    const getPageTitle = () => {
        switch (activeTab) {
            case 'houseboats': return 'Houseboats';
            case 'river-cruise': return 'River Cruise';
            case 'restaurant': return 'Restaurant';
            case 'contact': return 'Contact Us';
            default: return 'Houseboats';
        }
    };

    return (
        <div className="flex flex-col bg-white min-h-screen">

            {/* ===== HERO SECTION - Taller for more photo visibility ===== */}
            <section className="relative pt-16">

                {/* Background Image - Taller banner */}
                {websiteSettings?.heroImageUrl && (
                    <div className="w-full h-[350px] md:h-[420px] relative overflow-hidden">
                        <Image
                            src={websiteSettings.heroImageUrl}
                            alt="Houseboats on Alqueva"
                            fill
                            className="object-cover object-center"
                            priority
                        />
                        {/* Gradient fade to white at bottom - simpler fade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                    </div>
                )}

                {/* Title + Form - Below image, with more spacing */}
                <div className="container max-w-5xl mx-auto px-4 pb-12 -mt-40 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-semibold text-center text-gray-900 mb-8 drop-shadow-sm">
                        {getPageTitle()}
                    </h1>

                    {/* Search Form */}
                    <ReservationForm activeTab={activeTab} />
                </div>
            </section>

            {/* ===== FEATURED FLEET SECTION ===== */}
            {activeTab === 'houseboats' && (
                <section className="py-10 bg-gray-50">
                    <div className="container max-w-6xl mx-auto px-4">

                        {/* Section Header */}
                        <div className="mb-6">
                            <h2 className="text-xl font-normal text-gray-800 mb-1">
                                Our Fleet
                            </h2>
                            <p className="text-sm text-gray-500">
                                Explore our premium houseboats on Europe's largest reservoir
                            </p>
                        </div>

                        {/* Cards Grid */}
                        {/* Cards Grid with Carousel Controls */}
                        {/* Cards Grid with Carousel Controls */}
                        {/* Cards Grid with Carousel Controls */}
                        <div className="relative group">
                            <style jsx global>{`
                                .no-scrollbar::-webkit-scrollbar {
                                    display: none;
                                }
                                .no-scrollbar {
                                    -ms-overflow-style: none;
                                    scrollbar-width: none;
                                }
                            `}</style>

                            {/* Left Fade & Arrow - Conditional */}
                            <div className={`absolute left-0 top-0 bottom-0 -ml-4 w-16 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
                            {canScrollLeft && (
                                <button
                                    onClick={() => scroll('left')}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 bg-white p-2 rounded-full shadow-lg border border-gray-100 text-gray-700 hover:bg-gray-50 hover:scale-105 transition-all"
                                    aria-label="Previous"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            {/* Scroll Container */}
                            <div
                                ref={scrollContainerRef}
                                className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth no-scrollbar"
                            >
                                {isLoading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="flex-shrink-0 w-72">
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                                                <div className="h-40 bg-gray-200"></div>
                                                <div className="p-4 space-y-2">
                                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    featuredHouseboats?.map(boat => (
                                        <div key={boat.id} className="flex-shrink-0 w-72">
                                            <FeaturedHouseboatCard houseboat={boat} dictionary={dictionary.houseboat} />
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Right Fade & Arrow - Conditional */}
                            <div className={`absolute right-0 top-0 bottom-0 -mr-4 w-16 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
                            {canScrollRight && (
                                <button
                                    onClick={() => scroll('right')}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 bg-white p-2 rounded-full shadow-lg border border-gray-100 text-gray-700 hover:bg-gray-50 hover:scale-105 transition-all"
                                    aria-label="Next"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}
                        </div>

                    </div>
                </section>
            )}

            {/* ===== TESTIMONIALS SECTION ===== */}
            <section className="py-10 bg-white">
                <div className="container max-w-6xl mx-auto px-4">

                    {/* Section Header */}
                    <div className="mb-6">
                        <h2 className="text-xl font-normal text-gray-800 mb-1">
                            What our guests say
                        </h2>
                        <p className="text-sm text-gray-500">
                            Reviews from guests who experienced our houseboats
                        </p>
                    </div>

                    {/* Testimonial Cards */}
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                        {isLoadingTestimonials ? (
                            <div className="text-gray-500 text-sm">Loading testimonials...</div>
                        ) : testimonials && testimonials.length > 0 ? (
                            testimonials.map(testimonial => (
                                <div key={testimonial.id} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg border border-gray-200 p-5">
                                    <p className="text-sm text-gray-700 mb-4 italic">
                                        "{testimonial.quote}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{testimonial.name}</p>
                                            <div className="flex items-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-3 w-3 ${i < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 text-center text-gray-500">
                                No testimonials yet
                            </div>
                        )}
                    </div>

                </div>
            </section>

        </div>
    );
}
