'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Mail, PhoneCall } from 'lucide-react';
import { useSupabase } from '@/components/providers/supabase-provider';

interface LandingSecondarySectionsProps {
  houseboatsServiceImage?: string;
  riverCruiseServiceImage?: string;
  restaurantServiceImage?: string;
  models: any[];
  prices: any[];
  isLoadingContent: boolean;
}

type PermanentOfferItem = {
  id: string;
  title: string;
  highlight: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

type ServiceItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getModelImages(model: any): string[] {
  if (typeof model?.cover_image === 'string' && model.cover_image) return [model.cover_image];
  if (typeof model?.coverImage === 'string' && model.coverImage) return [model.coverImage];
  if (Array.isArray(model?.image_urls)) return model.image_urls;
  if (Array.isArray(model?.imageUrls)) return model.imageUrls;
  return [];
}

function getStartingPrice(modelId: string, prices: any[]): number | null {
  const modelPrices = prices.filter((price) => price?.model_id === modelId);
  if (modelPrices.length === 0) return null;

  const values = modelPrices
    .flatMap((price) => [
      pickNumber(price?.weekday, price?.weekday_price),
      pickNumber(price?.weekend, price?.weekend_price),
    ])
    .filter((value): value is number => typeof value === 'number' && value > 0);

  if (values.length === 0) return null;
  return Math.min(...values);
}

export default function LandingSecondarySections({
  houseboatsServiceImage,
  riverCruiseServiceImage,
  restaurantServiceImage,
  models,
  prices,
  isLoadingContent,
}: LandingSecondarySectionsProps) {
  const { supabase } = useSupabase();
  const houseboatsScrollRef = useRef<HTMLDivElement | null>(null);
  const [modelCoverById, setModelCoverById] = useState<Record<string, string>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('reveal-visible');
        });
      },
      { threshold: 0.15 }
    );

    const nodes = document.querySelectorAll('[data-reveal]');
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const allModels = useMemo(() => models ?? [], [models]);
  const featuredModels = useMemo(() => allModels, [allModels]);
  const featuredModelIds = useMemo(
    () =>
      featuredModels
        .map((model) => model?.id)
        .filter((id): id is string => typeof id === 'string'),
    [featuredModels]
  );
  const houseboatServiceImageResolved =
    houseboatsServiceImage || '/boat-hero.jpg';
  const riverCruiseServiceImageResolved =
    riverCruiseServiceImage || '/hero-placeholder-wide.jpg';
  const restaurantServiceImageResolved =
    restaurantServiceImage || '/boat-hero.jpg';
  const modelFallbackImage = houseboatServiceImageResolved;

  useEffect(() => {
    if (!supabase || featuredModelIds.length === 0) return;
    let isMounted = true;
    const fetchModelCovers = async () => {
      const { data, error } = await supabase
        .from('houseboat_models')
        .select('id, cover_image:image_urls->0')
        .in('id', featuredModelIds);
      if (error || !data || !isMounted) return;
      const nextCovers: Record<string, string> = {};
      data.forEach((row: any) => {
        if (typeof row?.id === 'string' && typeof row?.cover_image === 'string' && row.cover_image) {
          nextCovers[row.id] = row.cover_image;
        }
      });
      setModelCoverById(nextCovers);
    };

    fetchModelCovers();
    return () => {
      isMounted = false;
    };
  }, [featuredModelIds, supabase]);

  const permanentOffers: PermanentOfferItem[] = [
    {
      id: 'early-booking',
      title: 'Early Booking',
      highlight: '10%',
      description: 'Book early to secure your preferred dates, model, and better rate.',
      ctaLabel: 'Reserve early',
      ctaHref: '/houseboats?type=overnight&promo=early-booking',
    },
    {
      id: 'group-offer',
      title: 'Group Offer',
      highlight: '10%',
      description: 'Bring family or friends and unlock extra value for shared lake holidays.',
      ctaLabel: 'Reserve group stay',
      ctaHref: '/houseboats?type=overnight&promo=group-size',
    },
    {
      id: 'long-stay',
      title: 'Long Stay Offer',
      highlight: '10%',
      description: 'Stay 5 nights or more and enjoy better value on longer escapes.',
      ctaLabel: 'Reserve long stay',
      ctaHref: '/houseboats?type=overnight&promo=long-stay',
    },
  ];

  const services: ServiceItem[] = [
    {
      id: 'houseboats',
      eyebrow: 'Signature Stay',
      title: 'Houseboats',
      description: 'Sleep on the lake, wake up to open water, and cruise at your own rhythm with license-free navigation.',
      image: houseboatServiceImageResolved,
      ctaLabel: 'Choose your houseboat',
      ctaHref: '/houseboats',
    },
    {
      id: 'river-cruise',
      eyebrow: 'Group Experience',
      title: 'River Cruise',
      description: 'Bring your group together for a scenic cruise experience designed for celebrations, gatherings, and shared moments.',
      image: riverCruiseServiceImageResolved,
      ctaLabel: 'Plan your cruise day',
      ctaHref: '/river-cruise',
    },
    {
      id: 'restaurant',
      eyebrow: 'Lakefront Dining',
      title: 'Restaurant',
      description: 'Enjoy regional Portuguese flavors in a calm marina setting, ideal for family lunches and special occasions.',
      image: restaurantServiceImageResolved,
      ctaLabel: 'Reserve your table',
      ctaHref: '/restaurant',
    },
  ];

  const scrollHouseboats = (direction: 'left' | 'right') => {
    const node = houseboatsScrollRef.current;
    if (!node) return;
    const amount = Math.round(node.clientWidth * 0.82);
    node.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const ctaPrimaryClass =
    'cta-shimmer inline-flex h-10 items-center justify-center gap-1 rounded-full border-none px-5 text-sm font-semibold text-white';
  const ctaSecondaryClass =
    'inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800';

  return (
    <>
      <section className="bg-[#f3f6fb] py-14 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div data-reveal className="reveal-on-scroll mb-6">
            <p className="accent-chip px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
              Houseboat reservation offers
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              More value on every houseboat reservation
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              These permanent offers apply only to houseboat reservations. <span className="accent-highlight px-1.5 py-0.5 font-semibold">Combined offers are capped at 20% per reservation.</span>
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {permanentOffers.map((offer, index) => (
              <article
                key={offer.id}
                data-reveal
                style={{ transitionDelay: `${index * 70}ms` }}
                className="reveal-on-scroll relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-[#d6dce8] bg-[#fffdf8] p-6"
              >
                <span aria-hidden="true" className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-[#d6dce8]" />
                <span aria-hidden="true" className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-[#d6dce8]" />
                <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{offer.title}</h3>
                <p className="font-display mt-2 text-6xl font-bold tracking-tight text-[#2f6a2c] md:text-7xl">{offer.highlight}</p>
                <div className="mt-3 border-t border-dashed border-[#cfd7e6] pt-3">
                  <p className="text-sm leading-7 text-slate-600">{offer.description}</p>
                </div>
                <Link
                  href={offer.ctaHref}
                  className={`${ctaSecondaryClass} mt-auto`}
                >
                  {offer.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#2f6a2c]">
            Maximum combined offer per reservation: 20%
          </p>
          <div className="mt-5">
            <Link href="/houseboats?type=overnight" className={ctaPrimaryClass}>
              Start houseboat reservation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fcfdff] py-16 md:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div data-reveal className="reveal-on-scroll max-w-3xl">
            <p className="accent-chip px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              Why Amieira
            </p>
            <h3 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Three unforgettable ways to experience Alqueva
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              From private houseboat stays to scenic cruises and lakefront dining, every detail is crafted for effortless, memorable days.
            </p>
            <div className="mt-4 h-[2px] w-24 rounded-full bg-gradient-to-r from-[#79ab64] to-[#9cc989]" />
          </div>

          <div className="mt-8 space-y-6">
            {services.map((service, index) => (
              <article
                key={service.id}
                data-reveal
                style={{ transitionDelay: `${index * 90}ms` }}
                className="reveal-on-scroll grid items-stretch overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white md:grid-cols-2"
              >
                <div className={`flex min-h-[320px] flex-col justify-center p-7 md:min-h-[360px] md:p-10 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6a2c]">{service.eyebrow}</p>
                  <h4 className="font-display mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">{service.title}</h4>
                  <p className="mt-4 max-w-md text-base leading-8 text-slate-600">{service.description}</p>
                  <Link
                    href={service.ctaHref}
                    className={`${ctaSecondaryClass} mt-6`}
                  >
                    {service.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={`relative min-h-[320px] md:min-h-[360px] ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 560px"
                    className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b153f]/24 to-transparent" />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/houseboats?type=overnight" className={ctaPrimaryClass}>
              Start your booking
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#f4f7fc] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2" data-reveal>
              <p className="accent-chip px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                Houseboat Models
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Find Your Perfect Houseboat Model
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Compare layouts, guest comfort, and features to choose the right model for your Alqueva journey.
              </p>
            </div>
            <Link
              href="/houseboats"
              className={ctaPrimaryClass}
            >
              Compare all models
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div ref={houseboatsScrollRef} className="no-scrollbar overflow-x-auto pb-2 scroll-smooth">
            <div className="flex w-max gap-4 pr-1">
              {featuredModels.map((model, index) => {
                const modelImages = getModelImages(model);
                const coverImage = modelCoverById[model?.id] || modelImages[0] || modelFallbackImage;
                const optimalCapacity =
                  pickNumber(
                    model?.optimal_capacity,
                    model?.optimalCapacity,
                    model?.maximum_capacity,
                    model?.maximumCapacity
                  ) || 2;
                const maxCapacity =
                  pickNumber(
                    model?.maximum_capacity,
                    model?.maximumCapacity,
                    model?.optimal_capacity,
                    model?.optimalCapacity
                  ) || optimalCapacity;
                const bedrooms = pickNumber(model?.bedrooms, model?.bedroom_count) || 1;
                const bathrooms = pickNumber(model?.bathrooms, model?.bathroom_count) || 1;
                const modelName = model?.name || 'Houseboat';
                const startingPrice = getStartingPrice(model?.id, prices);
                const modelHref = model?.slug ? `/houseboats/${model.slug}` : '/houseboats';

                return (
                  <Link
                    key={model?.id || `${modelName}-${index}`}
                    href={modelHref}
                    data-reveal
                    className="reveal-on-scroll block min-h-[360px] w-[300px] overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white md:w-[320px]"
                    style={{ transitionDelay: `${index * 60}ms` }}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={coverImage}
                        alt={modelName}
                        fill
                        sizes="(max-width: 767px) 300px, 320px"
                        className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                      />
                    </div>
                    <div className="space-y-4 p-5">
                      <div>
                        <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{modelName}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Smart layouts and lake-ready comfort for couples, families, and group escapes.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Guests</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {optimalCapacity}-{maxCapacity}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Cabins</p>
                          <p className="mt-1 font-semibold text-slate-900">{bedrooms}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Baths</p>
                          <p className="mt-1 font-semibold text-slate-900">{bathrooms}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <p className="text-sm text-slate-500">
                          {startingPrice ? (
                            <>
                              From <span className="font-semibold text-slate-900">EUR {Math.round(startingPrice)}</span> / night
                            </>
                          ) : (
                            'Price on request'
                          )}
                        </p>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                          See model
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {isLoadingContent &&
                [...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="h-[360px] w-[300px] animate-pulse rounded-[1.2rem] border border-slate-200 bg-white md:w-[320px]"
                  />
                ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <p className="mr-auto self-center text-xs font-medium text-slate-500">
              Showing {featuredModels.length} of {allModels.length} models
            </p>
            <button
              type="button"
              onClick={() => scrollHouseboats('left')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Scroll houseboats left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollHouseboats('right')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Scroll houseboats right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#eef3f8] py-16 md:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
              <div data-reveal className="reveal-on-scroll">
                <p className="accent-chip px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                  Custom celebrations
                </p>
                <h3 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Birthdays, weddings, anniversaries, and private parties
                </h3>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  Build your celebration your way: houseboats, river cruise, restaurant, or a full cruise-and-dining mix.
                  Every event can be arranged with our staff, including sound system setup and a friendly atmosphere for your guests.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    'Houseboat reservations',
                    'River cruise',
                    'Restaurant dining',
                    'Cruise + food package',
                    'Sound system setup',
                    'Staff customization support',
                  ].map((item) => (
                    <span
                      key={item}
                      className="accent-chip px-3 py-1.5 text-xs font-semibold"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                  <a href="mailto:geral@amieiramarina.com" className="inline-flex items-center gap-2 hover:text-slate-900">
                    <Mail className="accent-icon h-4 w-4" />
                    geral@amieiramarina.com
                  </a>
                  <a href="tel:+351934343567" className="inline-flex items-center gap-2 hover:text-slate-900">
                    <PhoneCall className="accent-icon h-4 w-4" />
                    +351934343567
                  </a>
                  <a href="tel:+351933248039" className="inline-flex items-center gap-2 hover:text-slate-900">
                    <PhoneCall className="accent-icon h-4 w-4" />
                    +351933248039
                  </a>
                </div>
              </div>

              <div data-reveal className="reveal-on-scroll rounded-2xl border border-slate-200 bg-white p-5 md:p-6" style={{ transitionDelay: '90ms' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f6a2c]">Event planning</p>
                <h4 className="font-display mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  One team, one tailored proposal
                </h4>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Tell us your preferred date, guest profile, and celebration style. We will prepare a customized plan that fits your occasion.
                </p>
                <Link
                  href="/contact?requestType=event"
                  className={`${ctaPrimaryClass} mt-5 w-full`}
                >
                  Request your custom event plan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
