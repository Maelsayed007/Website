
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { DialogClose } from '@/components/ui/dialog';

type BoatImageGalleryProps = {
  imageUrls: string[];
  boatName: string;
};

export default function BoatImageGallery({ imageUrls, boatName }: BoatImageGalleryProps) {
  const [activeImage, setActiveImage] = useState(imageUrls[0]);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="relative flex items-center justify-center bg-muted text-muted-foreground h-96">
        <DialogClose className="absolute top-4 right-4 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors">
            <X size={24} />
       </DialogClose>
       <p>No images available.</p>
      </div>
    );
  }

  return (
    <div className="relative">
       <DialogClose className="absolute top-4 right-4 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors">
            <X size={24} />
       </DialogClose>
        <div className="aspect-video w-full relative">
            <Image
            src={activeImage}
            alt={`Main view of ${boatName}`}
            fill
            className="object-cover"
            />
        </div>
        <div className="p-4 bg-background">
            <h3 className="font-headline text-xl font-bold mb-4">{boatName} Photos</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 h-24 overflow-y-auto">
                {imageUrls.map((url, index) => (
                    <button key={index} onClick={() => setActiveImage(url)} className="relative aspect-square w-full rounded-md overflow-hidden outline-none ring-offset-2 focus-visible:ring-2 ring-primary">
                        <Image
                            src={url}
                            alt={`${boatName} thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                         {url === activeImage && <div className="absolute inset-0 border-2 border-primary rounded-md" />}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
}
