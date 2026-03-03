'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Ship, Utensils, Waves } from 'lucide-react';
import { useAppContext } from '@/components/app-layout';
import { cn } from '@/lib/utils';
import ReservationForm from '@/components/reservation-form';
import LandingSecondarySections from '@/components/landing/landing-secondary-sections';

interface ServerData {
    models: any[];
    prices: any[];
}

interface LandingPageContentProps {
    dictionary: any;
    serverData?: ServerData;
}

export default function LandingPageContent({ dictionary, serverData }: LandingPageContentProps) {
    const { websiteSettings } = useAppContext();
    const [activeService, setActiveService] = useState<'houseboats' | 'restaurant' | 'cruises'>('houseboats');

    const models: any[] = serverData?.models || [];
    const prices: any[] = serverData?.prices || [];
    const isLoadingContent = !serverData;

    const mainHeroImage = websiteSettings?.heroImageUrl || '/hero-placeholder-wide.jpg';
    const houseboatsServiceImage =
        websiteSettings?.homeHouseboatsImageUrl ||
        websiteSettings?.home_houseboats_image_url ||
        '/boat-hero.jpg';
    const riverCruiseServiceImage =
        websiteSettings?.homeRiverCruiseImageUrl ||
        websiteSettings?.home_river_cruise_image_url ||
        '/hero-placeholder-wide.jpg';
    const restaurantServiceImage =
        websiteSettings?.homeRestaurantImageUrl ||
        websiteSettings?.home_restaurant_image_url ||
        '/boat-hero.jpg';
    const travelTabs = [
        {
            key: 'houseboats',
            label: dictionary.navigation.links.houseboats || 'Houseboats',
            target: 'houseboats' as const,
            icon: Ship,
        },
        {
            key: 'restaurant',
            label: dictionary.navigation.links.restaurant || 'Restaurant',
            target: 'restaurant' as const,
            icon: Utensils,
        },
        {
            key: 'river-cruise',
            label: dictionary.navigation.links.riverCruise || 'River Cruises',
            target: 'cruises' as const,
            icon: Waves,
        },
    ];

    return (
        <div className="flex flex-col bg-white font-outfit">
            <section className="relative bg-[#040c23]">
                <div className="relative min-h-[650px] overflow-hidden md:min-h-[760px]">
                    <Image
                        src={mainHeroImage}
                        alt="Amieira Marina Lake View"
                        fill
                        sizes="100vw"
                        className="hero-breathe object-cover object-center brightness-[0.74] saturate-[0.78] contrast-[0.9]"
                        priority
                    />
                    <div className="absolute inset-0 bg-[#091737]/50" />

                    <div className="relative z-[20] flex min-h-[650px] flex-col items-center px-4 pt-28 text-center md:min-h-[760px] md:px-8 md:pt-40">
                        <h1 className="font-display mt-2 text-[2.8rem] font-bold leading-[0.98] tracking-tight text-white md:mt-0 md:text-[clamp(4.7rem,7.9vw,7.2rem)] md:whitespace-nowrap">
                            Find Your Perfect Stay
                        </h1>
                        <p className="mt-4 rounded-full border border-[#b9dea9]/95 bg-[#79ab64] px-6 py-2 text-[1.02rem] font-extrabold leading-tight tracking-tight text-[#f7fff0] md:text-[1.16rem]">
                            No licence required to navigate
                        </p>
                        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[#eff5ff] md:text-base">
                            <span className="rounded-md bg-[#79ab64]/30 px-1.5 py-0.5 font-semibold text-[#f3ffe7]">Private lake stays</span>, easy booking flow, and no licence required.
                        </p>

                        <div id="hero-reservation-card" className="mt-auto w-full max-w-[1180px] pb-7 md:pb-12">
                            <div className="relative mx-auto w-full">
                                <div className="relative z-20 mx-auto mb-0 w-fit">
                                    <div className="relative inline-flex h-[56px] items-center rounded-t-[22px] border border-slate-200 bg-white px-3 pb-0.5 pt-1 md:px-4">
                                        <div className="flex items-center gap-0.5">
                                            {travelTabs.map((tab) => {
                                                const isActive = !!tab.target && activeService === tab.target;
                                                const isClickable = !!tab.target;
                                                const TabIcon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        onClick={() => {
                                                            if (tab.target) setActiveService(tab.target);
                                                        }}
                                                        disabled={!isClickable}
                                                        className={cn(
                                                            'inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3.5 text-[0.82rem] font-semibold transition-all md:h-10 md:px-4 md:text-[0.88rem]',
                                                            isActive
                                                                ? 'bg-[#2b5fd8] text-white'
                                                                : isClickable
                                                                    ? 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                                    : 'bg-transparent text-slate-400 cursor-default'
                                                        )}
                                                    >
                                                        <TabIcon className="h-[15px] w-[15px]" />
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-30 -mt-[1px]">
                                <div className="hidden md:block">
                                    <ReservationForm activeTab={activeService === 'cruises' ? 'river-cruise' : activeService} variant="hero" />
                                </div>
                                <div className="md:hidden">
                                    <ReservationForm
                                        activeTab={activeService === 'cruises' ? 'river-cruise' : activeService}
                                        variant="embedded"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LandingSecondarySections
                houseboatsServiceImage={houseboatsServiceImage}
                riverCruiseServiceImage={riverCruiseServiceImage}
                restaurantServiceImage={restaurantServiceImage}
                models={models}
                prices={prices}
                isLoadingContent={isLoadingContent}
            />
        </div>
    );
}
