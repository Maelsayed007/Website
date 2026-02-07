'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { HouseboatModel, HouseboatModelPrice, Tariff, Booking } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListFilter, SortAsc } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import HouseboatCard from './houseboat-card';
import ReservationForm from './reservation-form';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import FeaturedHouseboatCard from './featured-houseboat-card';

export type HouseboatData = HouseboatModel & { calculatedPrice?: number; startingPrice?: number, isAvailable?: boolean };

export type InitialHouseboatData = {
  houseboatsWithPrices: HouseboatData[];
  allBoats: { id: string; modelId: string }[];
  allBookings: Booking[];
  allTariffs: Tariff[];
  allPrices: (HouseboatModelPrice & { modelId: string })[];
};

type HouseboatsPageContentProps = {
  dictionary: any;
  initialData: InitialHouseboatData;
};

const HouseboatsPageInner = ({ dictionary, initialData }: HouseboatsPageContentProps) => {
  const searchParams = useSearchParams();

  const [sortOrder, setSortOrder] = useState('price-asc');

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const guestsParam = searchParams.get('guests');

  const [guestFilter, setGuestFilter] = useState(guestsParam || 'all');

  const isSearchView = fromParam && toParam;

  const filteredAndSortedBoats = useMemo(() => {
    let boats = [...initialData.houseboatsWithPrices];

    // Filter by guests
    if (guestFilter !== 'all') {
      const minGuests = parseInt(guestFilter, 10);
      boats = boats.filter(boat => (boat.maximumCapacity || 0) >= minGuests);
    }

    // Sort
    boats.sort((a, b) => {
      if (isSearchView) {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
      }

      switch (sortOrder) {
        case 'price-asc':
          return (a.calculatedPrice ?? a.startingPrice ?? 99999) - (b.calculatedPrice ?? b.startingPrice ?? 99999);
        case 'price-desc':
          return (b.calculatedPrice ?? b.startingPrice ?? 0) - (a.calculatedPrice ?? a.startingPrice ?? 0);
        case 'capacity-desc':
          return (b.maximumCapacity || 0) - (a.maximumCapacity || 0);
        default:
          return 0;
      }
    });

    return boats;
  }, [initialData.houseboatsWithPrices, sortOrder, guestFilter, isSearchView]);

  if (isSearchView) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-28 space-y-8">
              <Card className="rounded-xl shadow-lg">
                <CardHeader>
                  <CardTitle>Refine Your Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReservationForm />
                </CardContent>
              </Card>
              <Card className="rounded-xl shadow-lg">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: '#010a1f' }}><ListFilter size={16} className="text-green-600" /> Filter by Guests</label>
                    <Select value={guestFilter} onValueChange={setGuestFilter}>
                      <SelectTrigger className="rounded-xl border-gray-300">
                        <SelectValue placeholder={dictionary.houseboats.filters.guestsPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{dictionary.houseboats.filters.allCapacities}</SelectItem>
                        <SelectItem value="2">2+ {dictionary.houseboats.filters.guests}</SelectItem>
                        <SelectItem value="4">4+ {dictionary.houseboats.filters.guests}</SelectItem>
                        <SelectItem value="6">6+ {dictionary.houseboats.filters.guests}</SelectItem>
                        <SelectItem value="8">8+ {dictionary.houseboats.filters.guests}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: '#010a1f' }}><SortAsc size={16} className="text-green-600" /> Sort By</label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="rounded-xl border-gray-300">
                        <SelectValue placeholder={dictionary.houseboats.filters.sortPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price-asc">{dictionary.houseboats.filters.priceAsc}</SelectItem>
                        <SelectItem value="price-desc">{dictionary.houseboats.filters.priceDesc}</SelectItem>
                        <SelectItem value="capacity-desc">{dictionary.houseboats.filters.capacityDesc}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
          <main className="lg:col-span-8 xl:col-span-9">
            <div className="mb-8 text-left">
              <h1 className="font-headline text-3xl font-bold tracking-tight" style={{ color: '#010a1f' }}>
                {dictionary.houseboats.title.replace('Our', 'Available')}
              </h1>
              <p className="mt-2 max-w-2xl text-md text-muted-foreground">
                {fromParam && toParam ? `Showing results for ${format(parseISO(fromParam), 'MMM dd')} - ${format(parseISO(toParam), 'MMM dd, yyyy')}` : ''}
              </p>
            </div>
            {filteredAndSortedBoats.length > 0 ? (
              <div className="space-y-8">
                {filteredAndSortedBoats.map(boat => (
                  <HouseboatCard
                    key={boat.id}
                    houseboat={boat}
                    price={boat.calculatedPrice}
                    isAvailable={boat.isAvailable!}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 flex-grow flex flex-col justify-center items-center h-96 bg-muted/50 rounded-lg border-2 border-dashed">
                <h2 className="font-headline text-2xl font-bold tracking-tight">{dictionary.houseboats.noResults.title}</h2>
                <p className="mt-2 text-muted-foreground">{dictionary.houseboats.noResults.description}</p>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  }

  // Default Fleet View
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl" style={{ color: '#010a1f' }}>
          {dictionary.houseboats.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {dictionary.houseboats.subtitle}
        </p>
      </div>

      {initialData.houseboatsWithPrices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {initialData.houseboatsWithPrices.map(boat => (
            <FeaturedHouseboatCard key={boat.id} houseboat={boat} dictionary={dictionary.houseboat} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-96"><CardContent className="w-full h-full bg-muted animate-pulse"></CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HouseboatsPageContent(props: HouseboatsPageContentProps) {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24"><div className="animate-pulse bg-muted h-96 rounded-2xl" /></div>}>
      <HouseboatsPageInner {...props} />
    </Suspense>
  );
}