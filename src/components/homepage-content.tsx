'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, Shield, Search, Ship } from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useAppContext } from '@/components/app-layout';
import type { HouseboatModel } from '@/lib/data-firestore';
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
        <div className="flex flex-col bg-white">


            {/* ===== HERO SECTION - Fully Framed with Navbar and Form ===== */}
            <section className="relative px-4 md:px-6 pt-4 pb-8 md:pb-12">

                {/* Framed Image Container */}
                {websiteSettings?.heroImageUrl && (
                    <div className="max-w-7xl mx-auto w-full aspect-[21/10] md:aspect-[21/9] min-h-[480px] max-h-[650px] relative rounded-[2.5rem] shadow-sm bg-white flex flex-col">
                        <Image
                            src={websiteSettings.heroImageUrl}
                            alt="Houseboats on Alqueva"
                            fill
                            className="object-cover object-center rounded-[2.5rem]"
                            priority
                        />

                        {/* Overlay Content */}
                        <div className="relative z-[1000] w-full h-full flex flex-col pt-3 md:pt-4 px-6 md:px-8 pb-6 md:pb-8">

                            {/* Navbar inside the frame */}
                            <div className="relative w-full mb-4">
                                <Header
                                    navigation={navigationDictionary}
                                    websiteSettings={websiteSettings}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    isFixed={true}
                                />
                            </div>



                            {/* Left Aligned Title & Subtitle - Positioned with breathing room from navbar */}
                            <div className="flex-grow flex flex-col justify-start w-[95%] max-w-6xl mx-auto px-8 pt-20 md:pt-24">
                                <h1 className="text-5xl md:text-7xl font-normal text-left text-[#34C759] font-display tracking-tight">
                                    {getPageTitle()}
                                </h1>
                                <p className="text-2xl md:text-3xl text-gray-800 font-medium mt-2 font-headline">
                                    Discover the magic of alqueva lake
                                </p>
                                <div className="flex items-center gap-2 text-black bg-[#34C759] mt-2 w-fit px-4 py-1 rounded-full font-medium">
                                    <Shield className="w-4 h-4 fill-current" />
                                    <span className="text-base uppercase tracking-wider">No license required</span>
                                </div>
                            </div>

                            {/* Form at the bottom inside the frame - Width matching Navbar */}
                            <div className="w-[95%] max-w-6xl mx-auto mb-0">
                                <ReservationForm activeTab={activeTab} />
                            </div>

                        </div>
                    </div>
                )}
            </section>

            {/* ===== MAIN CONTENT SECTION (Fleet / Cruises / Restaurant) ===== */}
            <section className="py-12 bg-[#34C759]/5 min-h-[400px]">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">

                    {/* Section Header - Dynamic based on activeTab */}
                    <div className="mb-12 text-center">
                        <h2 className="text-5xl md:text-6xl font-normal text-[#34C759] mb-4 font-display">
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

                    {/* Main Content Area */}
                    {activeTab === 'houseboats' ? (
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
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 bg-[#34C759] p-2 rounded-full shadow-lg text-black hover:bg-[#2DA64D] hover:scale-110 transition-all"
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
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 bg-[#34C759] p-2 rounded-full shadow-lg text-black hover:bg-[#2DA64D] hover:scale-110 transition-all"
                                    aria-label="Next"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                            <h3 className="text-xl font-medium text-gray-900 mb-2">Coming Soon</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                We are currently preparing the {activeTab.replace('-', ' ')} details for you. Check back soon for bookings and menus!
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* ===== PROMOTIONS SECTION ===== */}
            <section className="py-16 bg-white">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="text-5xl md:text-6xl font-normal text-[#34C759] mb-4 font-display">
                            Discover Promotions
                        </h2>
                        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                            Exclusive deals for your next adventure
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Promo Card 1 */}
                        <div className="bg-[#34C759]/5 rounded-2xl p-8 border border-[#34C759]/10 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="relative z-10">
                                <span className="inline-block bg-[#34C759] text-black text-xs font-bold px-3 py-1 rounded-full mb-4">LIMITED TIME</span>
                                <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-wide">Early Bird Special</h3>
                                <p className="text-gray-600 mb-6">Book your summer escape 3 months in advance and enjoy a 15% discount on all houseboats.</p>
                                <button className="text-black font-semibold flex items-center gap-2 hover:translate-x-1 transition-transform">
                                    Learn more <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Search className="w-32 h-32 text-[#34C759]" />
                            </div>
                        </div>

                        {/* Promo Card 2 */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="relative z-10">
                                <span className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-full mb-4">LAST MINUTE</span>
                                <h3 className="text-3xl font-normal text-gray-900 mb-2 font-display tracking-wide">Weekend Getaway</h3>
                                <p className="text-gray-600 mb-6">Suddenly free this weekend? Grab remaining boats with a 20% discount for 2-night stays.</p>
                                <button className="text-black font-semibold flex items-center gap-2 hover:translate-x-1 transition-transform">
                                    Check availability <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Ship className="w-32 h-32 text-black" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== PACKAGES SECTION ===== */}
            <section className="py-16 bg-[#34C759]/5">
                <div className="w-[95%] max-w-6xl mx-auto px-4 md:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="text-5xl md:text-6xl font-normal text-[#34C759] mb-4 font-display">
                            Exclusive Packages
                        </h2>
                        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                            Curated experiences for every occasion
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Package 1 */}
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <div className="h-48 bg-gray-200 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="p-6">
                                <h4 className="text-2xl font-normal text-gray-900 mb-1 font-display tracking-wide">Romantic Escape</h4>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">Perfect for couples. Includes a welcome bottle of wine, sunset dinner, and late check-out.</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-lg font-bold text-[#34C759]">From €299</span>
                                    <button className="bg-[#34C759] p-2 rounded-full hover:scale-110 transition-transform">
                                        <ChevronRight className="w-5 h-5 text-black" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Package 2 */}
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <div className="h-48 bg-gray-200 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="p-6">
                                <h4 className="text-2xl font-normal text-gray-900 mb-1 font-display tracking-wide">Family Explorer</h4>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">All-inclusive family fun. Includes fishing kits, paddle boards, and Alqueva activity map.</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-lg font-bold text-[#34C759]">From €450</span>
                                    <button className="bg-[#34C759] p-2 rounded-full hover:scale-110 transition-transform">
                                        <ChevronRight className="w-5 h-5 text-black" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Package 3 */}
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                            <div className="h-48 bg-gray-200 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="p-6">
                                <h4 className="text-2xl font-normal text-gray-900 mb-1 font-display tracking-wide">Wellness Weekend</h4>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">Recharge on the water. Includes Yoga mats, healthy breakfast hamper, and meditation guide.</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-lg font-bold text-[#34C759]">From €320</span>
                                    <button className="bg-[#34C759] p-2 rounded-full hover:scale-110 transition-transform">
                                        <ChevronRight className="w-5 h-5 text-black" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
