'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, Shield, Search, Ship } from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useAppContext } from '@/components/app-layout';
import { HouseboatModel } from '@/lib/types';
import FeaturedHouseboatCard from './featured-houseboat-card';
import ReservationForm from './reservation-form';
import Header from './header';

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
    const { activeTab, setActiveTab, websiteSettings, navigationDictionary } = useAppContext();

    const [featuredHouseboats, setFeaturedHouseboats] = useState<(HouseboatModel & { startingPrice?: number })[]>([]);
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);

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
            checkScroll();
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            if (container) container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [featuredHouseboats, isLoadingModels]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 350;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const fetchHouseboats = async () => {
            if (!supabase) return;
            setIsLoadingModels(true);
            try {
                const { data: models, error: modelsError } = await supabase.from('houseboat_models').select('*');
                if (modelsError) throw modelsError;

                const { data: prices } = await supabase.from('houseboat_prices').select('*');

                const processedModels = (models || []).map((model: any) => {
                    const modelPrices = (prices || []).filter((p: any) => p.model_id === model.id);
                    let startingPrice: number | undefined = undefined;
                    if (modelPrices.length > 0) {
                        const weekdays = modelPrices.map((p: any) => Number(p.weekday_price || 0)).filter((p: number) => p > 0);
                        if (weekdays.length > 0) startingPrice = Math.min(...weekdays);
                    }

                    return {
                        ...model,
                        optimalCapacity: model.optimal_capacity,
                        maximumCapacity: model.maximum_capacity,
                        imageUrls: model.image_urls || [],
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
        <div className="flex flex-col bg-white">
            <section className="relative px-4 md:px-6 pb-8 md:pb-12">
                {websiteSettings?.heroImageUrl && (
                    <div className="max-w-7xl mx-auto w-full aspect-[21/10] md:aspect-[21/9] min-h-[480px] max-h-[750px] relative rounded-b-[3rem] shadow-sm bg-white flex flex-col overflow-hidden">
                        <Image
                            src={websiteSettings.heroImageUrl}
                            alt="Houseboats on Alqueva"
                            fill
                            className="object-cover object-center"
                            priority
                        />
                        <div className="relative z-[1000] w-full h-full flex flex-col pt-3 md:pt-4 px-6 md:px-8 pb-6 md:pb-8">
                            <div className="relative w-full mb-4">
                                <Header
                                    navigation={navigationDictionary}
                                    websiteSettings={websiteSettings}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    isFixed={true}
                                />
                            </div>

                            <div className="flex-grow flex flex-col justify-start items-center w-[95%] max-w-7xl mx-auto px-8 pt-20 md:pt-28 text-center">
                                <h1 className="text-5xl md:text-7xl font-normal text-[#18230F] font-display tracking-tight">
                                    {getPageTitle()}
                                </h1>
                                <p className="text-4xl md:text-5xl font-normal text-[#18230F] font-display tracking-tight mt-2 opacity-90">
                                    Discover the magic of alqueva lake
                                </p>
                            </div>

                            <div className="w-[95%] max-w-6xl mx-auto mb-0 flex flex-col items-center">
                                <div className="flex items-center text-[#18230F] bg-[#34C759] mb-0 px-6 py-2 rounded-t-2xl font-bold w-fit">
                                    <span className="text-base uppercase tracking-wider">No license required</span>
                                </div>
                                <ReservationForm activeTab={activeTab} />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section className="py-12 bg-[#34C759]/5 min-h-[400px]">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">
                    <div className="mb-12 text-center text-left">
                        <h2 className="text-5xl md:text-6xl font-normal text-[#18230F] mb-4 font-display">
                            {activeTab === 'houseboats' ? 'Our Fleet' :
                                activeTab === 'river-cruise' ? 'River Cruises' :
                                    activeTab === 'restaurant' ? 'Dining @ Marina' : 'Contact Us'}
                        </h2>
                        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                            {activeTab === 'houseboats' ? 'Explore our premium houseboats on Europe\'s largest reservoir' :
                                activeTab === 'river-cruise' ? 'Discover the beauty of Alqueva from our scenic cruises' :
                                    activeTab === 'restaurant' ? 'Savor local delicacies with a marina view' : 'Get in touch for bookings and inquiries'}
                        </p>
                    </div>

                    {activeTab === 'houseboats' ? (
                        <div className="relative group">
                            <style jsx global>{`
                                .no-scrollbar::-webkit-scrollbar { display: none; }
                                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                            `}</style>

                            <div className={`absolute left-0 top-0 bottom-0 -ml-4 w-16 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
                            {canScrollLeft && (
                                <button
                                    onClick={() => scroll('left')}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 bg-[#34C759] p-2 rounded-full shadow-lg text-black hover:bg-[#2DA64D] hover:scale-110 transition-all font-bold"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth no-scrollbar">
                                {isLoadingModels ? (
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

                            <div className={`absolute right-0 top-0 bottom-0 -mr-4 w-16 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
                            {canScrollRight && (
                                <button
                                    onClick={() => scroll('right')}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 bg-[#34C759] p-2 rounded-full shadow-lg text-black hover:bg-[#2DA64D] hover:scale-110 transition-all font-bold"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                            <h3 className="text-xl font-medium text-[#18230F] mb-2 font-display">Coming Soon</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                We are currently preparing the {activeTab.replace('-', ' ')} details for you. Check back soon for bookings and menus!
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="py-16 bg-white">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">
                    <div className="mb-12 text-center text-left">
                        <h2 className="text-5xl md:text-6xl font-normal text-[#18230F] mb-4 font-display">Discover Promotions</h2>
                        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">Exclusive deals for your next adventure</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#34C759]/5 rounded-2xl p-8 border border-[#34C759]/10 relative overflow-hidden group hover:shadow-md transition-all text-left">
                            <span className="inline-block bg-[#34C759] text-[#18230F] text-xs font-bold px-3 py-1 rounded-full mb-4">LIMITED TIME</span>
                            <h3 className="text-3xl font-normal text-[#18230F] mb-2 font-display tracking-wide">Early Bird Special</h3>
                            <p className="text-gray-600 mb-6">Book your summer escape 3 months in advance and enjoy a 15% discount on all houseboats.</p>
                            <button className="text-[#18230F] font-semibold flex items-center gap-2 hover:translate-x-1 transition-transform font-bold">
                                Learn more <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Search className="w-32 h-32 text-[#34C759]" />
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all text-left">
                            <span className="inline-block bg-[#18230F] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 font-bold">LAST MINUTE</span>
                            <h3 className="text-3xl font-normal text-[#18230F] mb-2 font-display tracking-wide">Weekend Getaway</h3>
                            <p className="text-gray-600 mb-6">Suddenly free this weekend? Grab remaining boats with a 20% discount for 2-night stays.</p>
                            <button className="text-[#18230F] font-semibold flex items-center gap-2 hover:translate-x-1 transition-transform font-bold">
                                Check availability <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Ship className="w-32 h-32 text-[#18230F]" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
