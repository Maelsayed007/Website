'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Ship, Clock } from 'lucide-react';
import RestaurantGallery from './restaurant-gallery';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useAppContext } from '@/components/app-layout';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Boat, HouseboatModel } from '@/lib/types';
import FeaturedHouseboatCard from './featured-houseboat-card';
import BookingSidebar from './booking-sidebar';
import ReservationForm from './reservation-form';
import RestaurantReservationForm from './restaurant-reservation-form';
import Header from './header';
import { Button } from './ui/button';

interface HomePageContentProps {
    dictionary: any;
}

export default function HomePageContent({ dictionary, initialTab }: HomePageContentProps & { initialTab?: string }) {
    const { supabase } = useSupabase();
    const { websiteSettings, navigationDictionary } = useAppContext();
    const searchParams = useSearchParams();
    const activeTab = initialTab || 'houseboats';

    const [featuredHouseboats, setFeaturedHouseboats] = useState<(HouseboatModel & { startingPrice?: number })[]>([]);
    const [riverPackages, setRiverPackages] = useState<any[]>([]);
    const [restaurantMenus, setRestaurantMenus] = useState<any[]>([]);

    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [preselectedOfferIds, setPreselectedOfferIds] = useState<string[]>([]);
    const [boats, setBoats] = useState<Boat[]>([]);
    const [models, setModels] = useState<HouseboatModel[]>([]);
    const [prices, setPrices] = useState<any[]>([]);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const [availableExtras, setAvailableExtras] = useState<any[]>([]);

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
    }, [featuredHouseboats, riverPackages, restaurantMenus, isLoadingModels]);

    // Handle URL Offer Params
    useEffect(() => {
        const offerId = searchParams.get('offer');
        if (offerId) {
            setPreselectedOfferIds([offerId]);
            setIsSidebarOpen(true);
            // Clean up URL without refresh
            const url = new URL(window.location.href);
            url.searchParams.delete('offer');
            window.history.replaceState({}, '', url);
        }
    }, [searchParams]);

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
        const fetchContent = async () => {
            if (!supabase) return;
            setIsLoadingModels(true);
            try {
                // 1. Houseboats
                const { data: models, error: modelsError } = await supabase.from('houseboat_models').select('*');
                if (!modelsError) {
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

                    // Filtering based on search params
                    const guests = searchParams.get('guests');
                    let filteredModels = processedModels;
                    if (guests && guests !== '0') {
                        const guestCount = parseInt(guests);
                        filteredModels = processedModels.filter(m => (m.maximumCapacity || 0) >= guestCount);
                    }

                    setFeaturedHouseboats(filteredModels);
                }

                // 2. River Cruises
                const { data: packages, error: pkgError } = await supabase
                    .from('daily_travel_packages')
                    .select('*')
                    .limit(6);
                if (!pkgError) setRiverPackages(packages || []);

                // 3. Restaurant Menus
                const { data: menus, error: menuError } = await supabase
                    .from('restaurant_menus')
                    .select('*, dishes:menu_dishes(*)')
                    .eq('is_active', true)
                    .order('sort_order')
                    .limit(6);
                if (!menuError) {
                    const sorted = (menus || []).map((m: any) => ({
                        ...m,
                        price_senior: m.price_senior || 0,
                        dishes: (m.dishes || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
                    }));
                    setRestaurantMenus(sorted);
                }

                // 4. Detailed Data for Sidebar
                const { data: boatsData } = await supabase.from('boats').select('*');
                setBoats(boatsData || []);

                const { data: pricesData } = await supabase.from('houseboat_prices').select('*');
                setPrices(pricesData || []);

                const { data: tariffsData } = await supabase.from('tariffs').select('*');
                setTariffs(tariffsData || []);

                const { data: extrasData } = await supabase.from('extras').select('*');
                setAvailableExtras(extrasData || []);

                setModels(models || []);

            } catch (error) {
                console.error("Error fetching content:", error);
            } finally {
                setIsLoadingModels(false);
            }
        };
        fetchContent();
    }, [supabase, searchParams]); // Run when search params change

    // Scroll to results if searching
    useEffect(() => {
        if (searchParams.get('from') || searchParams.get('guests')) {
            const resultsSection = document.getElementById('featured-sections');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [searchParams]);

    // Handle Offer Query Parameter
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const offerId = searchParams.get('offer');
        if (offerId) {
            setPreselectedOfferIds([offerId]);
            setIsSidebarOpen(true);
        }
    }, []);

    const getPageTitle = () => {
        switch (activeTab) {
            case 'houseboats': return 'Houseboats';
            case 'river-cruise': return 'River Cruise';
            case 'restaurant': return 'Restaurant';
            case 'contact': return 'Contact Us';
            default: return 'Houseboats';
        }
    };

    const renderCarouselContent = () => {
        if (isLoadingModels) {
            return [...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-72">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                        <div className="h-40 bg-gray-200"></div>
                        <div className="p-4 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                        </div>
                    </div>
                </div>
            ));
        }

        if (activeTab === 'houseboats') {
            return featuredHouseboats.map(boat => (
                <div key={boat.id} className="flex-shrink-0 w-72">
                    <FeaturedHouseboatCard houseboat={boat} dictionary={dictionary.houseboat} />
                </div>
            ));
        }

        if (activeTab === 'river-cruise') {
            if (riverPackages.length === 0) return <EmptyState tab="River Cruises" />;
            return riverPackages.map(pkg => (
                <div key={pkg.id} className="flex-shrink-0 w-80 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 bg-gray-200">
                        {pkg.photo_url ? (
                            <Image src={pkg.photo_url} alt={pkg.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100"><Ship className="h-12 w-12 opacity-50" /></div>
                        )}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {pkg.duration_hours}h
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{pkg.destination || 'Scenic river tour'}</p>
                        <div className="flex justify-between items-center">
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-gray-400">from</span>
                                <span className="text-xl font-black text-[#34C759]">€{pkg.pricing?.adult || 0}</span>
                            </div>
                            <Link href="/river-cruise">
                                <Button size="sm" className="rounded-full bg-[#18230F] hover:bg-[#34C759] text-white">Book Now</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ));
        }

        if (activeTab === 'restaurant') {
            if (restaurantMenus.length === 0) return <EmptyState tab="Menus" />;
            return restaurantMenus.map(menu => (
                <div key={menu.id} className="flex-shrink-0 w-80 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-40 bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center">
                        <div className="text-center p-4">
                            <h4 className="font-display text-[#18230F] text-lg uppercase tracking-widest">Set Menu</h4>
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{menu.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10 italic">"{menu.description}"</p>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-3 text-xs font-bold">
                                <span className="text-blue-600">Kid €{menu.price_child}</span>
                                <span className="text-emerald-600">Adult €{menu.price_adult}</span>
                                <span className="text-amber-600">Senior €{menu.price_senior || 0}</span>
                            </div>
                            <Link href="/restaurant">
                                <Button size="sm" variant="outline" className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50">View</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ));
        }

        return null;
    };

    const EmptyState = ({ tab }: { tab: string }) => (
        <div className="w-full flex-shrink-0 p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400">No {tab} available at the moment.</p>
        </div>
    );

    const getHeroImage = () => {
        if (activeTab === 'river-cruise') return '/river-cruise-hero.jpg';
        if (activeTab === 'restaurant' && websiteSettings?.restaurantHeroImageUrl) return websiteSettings.restaurantHeroImageUrl;
        return websiteSettings?.heroImageUrl || '/boat-hero.jpg';
    };

    return (
        <div className="flex flex-col bg-white">
            <section className="relative px-4 md:px-6 pb-8 md:pb-12">
                <div className="max-w-[1440px] mx-auto w-full aspect-[21/10] md:aspect-[21/9] min-h-[480px] max-h-[750px] relative rounded-b-[3rem] shadow-sm bg-white flex flex-col overflow-hidden">
                    <Image
                        src={getHeroImage()}
                        alt="Background"
                        fill
                        className={cn(
                            "object-cover object-center transition-all duration-700",
                        )}
                        priority
                    />
                    <div className="relative z-[1000] w-full h-full flex flex-col pt-3 md:pt-4 px-6 md:px-8 pb-6 md:pb-8">
                        <div className="relative w-full mb-4">
                            <Header
                                navigation={navigationDictionary}
                                websiteSettings={websiteSettings}
                                isFixed={true}
                            />
                        </div>

                        <div className={cn(
                            "flex-grow flex flex-col w-[98%] max-w-[1440px] mx-auto px-8 pt-20 md:pt-28 transition-all duration-500",
                            activeTab === 'river-cruise' ? "lg:flex-row items-center gap-16 text-left lg:pt-32" : "items-center text-center"
                        )}>
                            <div className={cn("flex-grow", activeTab === 'river-cruise' ? "lg:w-1/2" : "")}>
                                <h1 className="text-5xl md:text-8xl font-normal text-[#18230F] font-display tracking-tight leading-[1.1]">
                                    {getPageTitle()}
                                </h1>
                                {activeTab === 'river-cruise' ? (
                                    <div className="animate-in fade-in slide-in-from-left duration-700">
                                        <p className="font-body text-3xl md:text-4xl font-normal text-[#18230F] tracking-tight mt-6 opacity-90 leading-tight max-w-2xl">
                                            Explore the natural beauty of Alqueva Lake on our premium cruises.
                                            The perfect choice for sightseeing, celebrations, and unforgettable group experiences.
                                        </p>
                                    </div>
                                ) : activeTab === 'restaurant' ? (
                                    <p className="text-4xl md:text-5xl font-normal text-[#18230F] font-display tracking-tight mt-2 opacity-90 leading-tight">
                                        A Culinary Journey by the Lake
                                    </p>
                                ) : (
                                    <p className="text-4xl md:text-5xl font-normal text-[#18230F] font-display tracking-tight mt-2 opacity-90 leading-tight">
                                        Discover the magic of Alqueva Lake
                                    </p>
                                )}

                                {activeTab === 'river-cruise' && (
                                    <div className="mt-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                        <p className="font-body text-[#34C759] font-bold text-2xl md:text-4xl uppercase tracking-tight">
                                            Groups up to 120 people
                                        </p>
                                        <div className="font-body flex items-center gap-3 text-[#18230F] font-semibold uppercase tracking-widest text-sm opacity-70">
                                            <div className="h-1.5 w-1.5 bg-[#34C759] rounded-full" />
                                            Professional Skipper Included • Daily Departures
                                        </div>
                                    </div>
                                )}
                            </div>

                            {activeTab === 'river-cruise' && (
                                <div className="hidden lg:block w-1/2 relative aspect-[4/3] rounded-[2.5rem] overflow-hidden transform hover:scale-[1.01] transition-all duration-700 animate-in fade-in zoom-in-95 duration-700 delay-200">
                                    <Image
                                        src="/river-cruise-hero.jpg"
                                        alt="Guadiana vessel"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            )}
                        </div>

                        <div className="w-[95%] max-w-6xl mx-auto mb-0 flex flex-col items-center">
                            <div className="flex items-center text-[#18230F] bg-[#34C759] mb-0 px-6 py-2 rounded-t-2xl font-bold w-fit">
                                <span className="text-base uppercase tracking-wider">
                                    {activeTab === 'houseboats' ? 'No license required' :
                                        activeTab === 'river-cruise' ? 'Skipper included' :
                                            activeTab === 'restaurant' ? 'Riverside Dining' : 'Contact Us'}
                                </span>
                            </div>

                            {activeTab === 'restaurant' ? (
                                <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 w-full shadow-2xl border border-white/50 animate-in slide-in-from-bottom-10 fade-in duration-700">
                                    <RestaurantGallery />

                                    {/* Full Menu Display */}
                                    <div className="my-12 max-w-5xl mx-auto">
                                        {restaurantMenus.map((menu: any, menuIdx: number) => {
                                            // Group dishes by category
                                            const grouped: Record<string, any[]> = {};
                                            (menu.dishes || []).forEach((d: any) => {
                                                const cat = d.category || 'Other';
                                                if (!grouped[cat]) grouped[cat] = [];
                                                grouped[cat].push(d);
                                            });
                                            const cats = Object.keys(grouped);

                                            return (
                                                <div key={menu.id} className={menuIdx > 0 ? 'mt-16 pt-16 border-t border-stone-200' : ''}>
                                                    {/* Menu Header */}
                                                    <div className="text-center mb-10">
                                                        <h3 className="text-4xl md:text-5xl font-display text-[#18230F] tracking-tight">
                                                            {menu.name}
                                                        </h3>
                                                        {menu.description && (
                                                            <p className="text-stone-500 italic text-lg mt-3 max-w-xl mx-auto leading-relaxed">
                                                                {menu.description}
                                                            </p>
                                                        )}
                                                        {/* 3-Tier Pricing */}
                                                        <div className="flex justify-center gap-6 mt-6">
                                                            <div className="text-center">
                                                                <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Kid</span>
                                                                <span className="text-xl font-black text-[#34C759]">€{menu.price_child}</span>
                                                            </div>
                                                            <div className="w-px bg-stone-200" />
                                                            <div className="text-center">
                                                                <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Adult</span>
                                                                <span className="text-xl font-black text-[#34C759]">€{menu.price_adult}</span>
                                                            </div>
                                                            <div className="w-px bg-stone-200" />
                                                            <div className="text-center">
                                                                <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Senior</span>
                                                                <span className="text-xl font-black text-[#34C759]">€{menu.price_senior || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Categories + Dishes */}
                                                    {cats.length > 0 ? (
                                                        <div className={cn(
                                                            'grid gap-x-16 gap-y-10',
                                                            cats.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : 'md:grid-cols-2'
                                                        )}>
                                                            {cats.map(cat => (
                                                                <div key={cat}>
                                                                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-[#34C759] mb-4 pb-2 border-b border-[#34C759]/20">
                                                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                                    </h4>
                                                                    <div className="space-y-4">
                                                                        {grouped[cat].map((dish: any) => (
                                                                            <div key={dish.id}>
                                                                                <div className="flex justify-between items-baseline">
                                                                                    <h5 className="text-base font-bold text-[#18230F]">{dish.name}</h5>
                                                                                </div>
                                                                                {dish.description && (
                                                                                    <p className="text-sm text-stone-400 mt-0.5 leading-relaxed">{dish.description}</p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-center text-stone-400 italic py-8">Menu details coming soon.</p>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {restaurantMenus.length === 0 && (
                                            <div className="text-center py-12">
                                                <p className="text-stone-400 text-lg">Our menus are being updated. Please check back soon.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center pb-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="lg" className="rounded-full bg-[#18230F] hover:bg-[#34C759] text-white px-10 py-7 text-xl font-display shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                                                    Book a Table
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-lg bg-white rounded-2xl border-none p-0 overflow-hidden">
                                                <DialogTitle className="sr-only">Reserve Your Table</DialogTitle>
                                                <div className="bg-[#34C759] p-4 text-center">
                                                    <h3 className="text-[#18230F] font-bold text-xl uppercase tracking-widest">Reserve Your Table</h3>
                                                </div>
                                                <div className="p-6">
                                                    <RestaurantReservationForm dictionary={dictionary.restaurant} />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            ) : activeTab === 'river-cruise' ? (
                                null
                            ) : (
                                <ReservationForm activeTab={activeTab} />
                            )}
                        </div>
                    </div>
                </div>
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
                            {renderCarouselContent()}
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
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all text-left">
                            <span className="inline-block bg-[#18230F] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 font-bold">LAST MINUTE</span>
                            <h3 className="text-3xl font-normal text-[#18230F] mb-2 font-display tracking-wide">Weekend Getaway</h3>
                            <p className="text-gray-600 mb-6">Suddenly free this weekend? Grab remaining boats with a 20% discount for 2-night stays.</p>
                            <button className="text-[#18230F] font-semibold flex items-center gap-2 hover:translate-x-1 transition-transform font-bold">
                                Check availability <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <BookingSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onSave={async (booking) => {
                    const { error } = await supabase.from('bookings').insert(booking).select().single();
                    if (error) throw error;
                    setIsSidebarOpen(false);
                }}
                boats={boats}
                models={models}
                prices={prices}
                tariffs={tariffs}
                availableExtras={availableExtras}
                initialSelectedOfferIds={preselectedOfferIds}
            />
        </div>
    );
}
