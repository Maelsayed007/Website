'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/components/providers/supabase-provider';
import { RestaurantPhoto } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function RestaurantGallery() {
    const { supabase } = useSupabase();
    const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!supabase) return;
        const fetchPhotos = async () => {
            const { data } = await supabase
                .from('restaurant_photos')
                .select('*')
                .order('sort_order', { ascending: true });

            if (data) setPhotos(data);
            setIsLoading(false);
        };
        fetchPhotos();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
            </div>
        );
    }

    if (photos.length === 0) return null;

    return (
        <div className="py-12">
            <h3 className="text-2xl font-serif text-[#18230F] mb-8 text-center italic">
                A Glimpse of our Atmosphere
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                    <Dialog key={photo.id}>
                        <DialogTrigger asChild>
                            <div className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
                                <div className="aspect-[4/3] relative">
                                    <Image
                                        src={photo.image_url}
                                        alt={photo.caption || 'Restaurant photo'}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl bg-transparent border-none shadow-none p-0 flex justify-center items-center">
                            <DialogTitle className="sr-only">Restaurant photo preview</DialogTitle>
                            <div className="relative w-full h-[80vh] bg-transparent">
                                <Image
                                    src={photo.image_url}
                                    alt={photo.caption || 'Restaurant photo'}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                ))}
            </div>
        </div>
    );
}
