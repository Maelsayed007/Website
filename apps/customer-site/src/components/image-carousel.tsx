'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type ImageCarouselProps = {
  images: string[];
  alt: string;
  className?: string;
};

export function ImageCarousel({ images, alt, className }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!images || images.length === 0) {
    return (
      <div className={cn('relative bg-muted', className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group relative overflow-hidden', className)}>
      <Image
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {images.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === currentIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/60'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
