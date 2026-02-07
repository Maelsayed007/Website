'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import placeholderData from '@/lib/placeholder-images.json';
import { useToast } from '@/hooks/use-toast';
import RestaurantMenu from '@/components/restaurant-menu';
import { useSupabase } from '@/components/providers/supabase-provider';
import RestaurantReservationForm from './restaurant-reservation-form';

const PlaceHolderImages = placeholderData.placeholderImages;

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
};

type MenuCategory = {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
};

type RestaurantPageContentProps = {
  dictionary: {
    hero: { title: string; subtitle: string; };
    about: { title: string; description1: string; description2: string; };
    menu: { title: string; subtitle: string; notAvailable: string; };
    form: {
      title: string;
      name: string; namePlaceholder: string;
      email: string; emailPlaceholder: string;
      phone: string;
      date: string; datePlaceholder: string;
      time: string; timePlaceholder: string;
      guests: string; guestsPlaceholder: string;
      guestLabel: string; guestsLabel: string;
      seating: string; seatingPlaceholder: string;
      seatingIndoor: string; seatingOutdoor: string; seatingAny: string;
      submit: string; submitting: string;
      success: { title: string; description: string; };
      error: { title: string; description: string; };
    };
  };
};

export default function RestaurantPageContent({ dictionary }: RestaurantPageContentProps) {
  const restaurantImage = PlaceHolderImages.find(p => p.id === 'restaurant-view-1');
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    setIsLoadingMenu(true);

    const fetchMenu = async () => {
      try {
        // Fetch categories
        const { data: categories, error: catError } = await supabase
          .from('restaurant_menu_categories')
          .select('*')
          .order('order_index');

        if (catError) throw catError;

        const categoriesWithItems: MenuCategory[] = [];

        for (const cat of (categories || [])) {
          // Fetch items for each category
          const { data: items, error: itemsError } = await supabase
            .from('restaurant_menu_items')
            .select('*')
            .eq('category_id', cat.id);

          if (itemsError) throw itemsError;

          categoriesWithItems.push({
            id: cat.id,
            name: cat.name,
            order: cat.order,
            items: items || []
          });
        }

        setMenu(categoriesWithItems);
      } catch (error) {
        console.error("Failed to fetch menu:", error);
        toast({ variant: 'destructive', title: "Could not load menu." });
      } finally {
        setIsLoadingMenu(false);
      }
    };

    fetchMenu();
  }, [supabase, toast]);

  return (
    <>
      <section className="relative h-96 w-full bg-muted">
        {restaurantImage && (
          <Image
            src={restaurantImage.imageUrl}
            alt={restaurantImage.description}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white">
          <h1 className="font-headline text-4xl font-bold md:text-6xl" style={{ color: 'white' }}>
            {dictionary.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg">
            {dictionary.hero.subtitle}
          </p>
        </div>
      </section>
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="lg:pr-8 mb-12">
              <h2 className="font-headline text-3xl font-bold" style={{ color: '#010a1f' }}>{dictionary.about.title}</h2>
              <p className="mt-4 text-muted-foreground" style={{ color: '#010a1f' }}>
                {dictionary.about.description1}
              </p>
              <p className="mt-4 text-muted-foreground" style={{ color: '#010a1f' }}>
                {dictionary.about.description2}
              </p>
            </div>
            <RestaurantMenu menu={menu} isLoading={isLoadingMenu} dictionary={dictionary.menu} />
          </div>
          <div className="lg:col-span-2">
            <div className="sticky top-28">
              <div className="rounded-2xl border bg-white p-6 shadow-xl">
                <h3 className="font-headline text-2xl font-semibold mb-4" style={{ color: '#010a1f' }}>{dictionary.form.title}</h3>
                <RestaurantReservationForm dictionary={dictionary} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
