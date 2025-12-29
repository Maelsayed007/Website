'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, Bed, ArrowRight } from 'lucide-react';

interface FeaturedHouseboatCardProps {
  houseboat: any;
  dictionary: any;
}

export default function FeaturedHouseboatCard({
  houseboat,
  dictionary,
}: FeaturedHouseboatCardProps) {
  const imageUrl = houseboat.imageUrls?.[0] || houseboat.images?.[0] || houseboat.image_urls?.[0] || '/placeholder-houseboat.jpg';

  const optimalCapacity = houseboat.optimalCapacity || houseboat.optimal_capacity || 6;
  const maxCapacity = houseboat.maximumCapacity || houseboat.maximum_capacity || optimalCapacity;
  const bedrooms = houseboat.bedrooms;

  return (
    <Link
      href={`/houseboats/${houseboat.id}`}
      className="block group h-full"
    >
      {/* 
         Visual Updates:
         1. bg-slate-100 -> Distinct from white background.
         2. border-2 border-slate-200 -> Stronger visual boundary.
         3. shadow-lg -> Lift off page.
      */}
      <div className="h-full flex flex-col sm:flex-row bg-slate-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-slate-200">

        {/* IMAGE - Left Side (Reduced to 45% per request) */}
        <div className="relative w-full sm:w-[45%] h-56 sm:h-auto min-h-[14rem] overflow-hidden bg-slate-200 flex-shrink-0">
          <Image
            src={imageUrl}
            alt={houseboat.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* CONTENT - Right Side (55%) */}
        <div className="p-5 flex flex-col justify-center relative w-full sm:w-[55%] bg-slate-100">

          <div className="flex justify-between items-start mb-2">
            <h3
              className="text-xl font-bold line-clamp-1 group-hover:text-green-600 transition-colors text-slate-900"
            >
              {houseboat.name}
            </h3>
          </div>

          {houseboat.description && (
            <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed font-medium">
              {houseboat.description}
            </p>
          )}

          {/* Features Row */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3">
            {/* Capacity */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Users className="w-3.5 h-3.5 text-green-600" />
              <span className="font-bold text-slate-700">{optimalCapacity}-{maxCapacity} Guests</span>
            </div>

            {/* Bedrooms */}
            {bedrooms && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <Bed className="w-3.5 h-3.5 text-green-600" />
                <span className="font-bold text-slate-700">{bedrooms} Rooms</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="flex items-center text-sm font-bold text-green-600 group-hover:translate-x-1 transition-transform mt-auto pt-1">
            View Details <ArrowRight className="w-4 h-4 ml-1" />
          </div>

        </div>

      </div>
    </Link>
  );
}