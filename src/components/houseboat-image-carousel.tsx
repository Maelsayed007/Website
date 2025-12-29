'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type HouseboatImageCarouselProps = {
  imageUrls: string[];
};

export default function HouseboatImageCarousel({
  imageUrls,
}: HouseboatImageCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainApiRef, mainApi] = useEmblaCarousel({
    loop: true,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi]
  );

  useEffect(() => {
    if (!mainApi) return;

    const handleSelect = () => {
      if (!mainApi) return;
      const newSelectedIndex = mainApi.selectedScrollSnap();
      setSelectedIndex(newSelectedIndex);
    };

    mainApi.on('select', handleSelect);
    mainApi.on('reInit', handleSelect);

    handleSelect();

    return () => {
      mainApi?.off('select', handleSelect);
      mainApi?.off('reInit', handleSelect);
    };
  }, [mainApi]);

  const scrollPrev = useCallback(
    () => mainApi?.scrollPrev(),
    [mainApi]
  );
  const scrollNext = useCallback(
    () => mainApi?.scrollNext(),
    [mainApi]
  );

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="aspect-[4/3] w-full bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground shadow-inner border">
        No Images Available
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="relative group">
        <div className="overflow-hidden rounded-t-lg" ref={mainApiRef}>
          <div className="flex" style={{ height: 'auto' }}>
            {imageUrls.map((url, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] relative aspect-[4/3] transition-transform duration-300 ease-in-out"
              >
                <Image
                  src={url}
                  alt={`Houseboat view ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollPrev}
          className="absolute top-1/2 -translate-y-1/2 left-2 z-10 rounded-full h-8 w-8 bg-background/50 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollNext}
          className="absolute top-1/2 -translate-y-1/2 right-2 z-10 rounded-full h-8 w-8 bg-background/50 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {imageUrls.map((_, index) => (
            <button
              key={index}
              onClick={() => onThumbClick(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === selectedIndex ? 'bg-white' : 'bg-white/50'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
