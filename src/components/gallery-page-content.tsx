'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import placeholderData from '@/lib/placeholder-images.json';
import { motion, AnimatePresence } from 'framer-motion';

type GalleryPageContentProps = {
  dictionary: {
    title: string;
    subtitle: string;
    categories: {
      all: string;
      houseboat: string;
      restaurant: string;
      scenery: string;
    };
  };
};

type ImageCategory = 'all' | 'houseboat' | 'restaurant' | 'scenery';
type PlaceHolderImage = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  category: ImageCategory;
}

const allImages = placeholderData.placeholderImages.filter(
  p => p.id !== 'not-found' && p.id !== 'login-background'
) as PlaceHolderImage[];

export default function GalleryPageContent({ dictionary }: GalleryPageContentProps) {
  const [activeCategory, setActiveCategory] = useState<ImageCategory>('all');

  const categories: { id: ImageCategory; label: string }[] = [
    { id: 'all', label: dictionary.categories.all },
    { id: 'houseboat', label: dictionary.categories.houseboat },
    { id: 'restaurant', label: dictionary.categories.restaurant },
    { id: 'scenery', label: dictionary.categories.scenery },
  ];

  const filteredImages = useMemo(() => {
    if (activeCategory === 'all') {
      return allImages;
    }
    return allImages.filter(image => image.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
          {dictionary.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {dictionary.subtitle}
        </p>
      </div>

      <Tabs
        defaultValue="all"
        className="mt-12 flex flex-col items-center"
        onValueChange={value => setActiveCategory(value as ImageCategory)}
      >
        <TabsList className="mb-8">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>div:not(:first-child)]:mt-4">
          <AnimatePresence>
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="overflow-hidden rounded-lg shadow-md break-inside-avoid"
              >
                <Image
                  src={image.imageUrl}
                  alt={image.description}
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  data-ai-hint={image.imageHint}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}
