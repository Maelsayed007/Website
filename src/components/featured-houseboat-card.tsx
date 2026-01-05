'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, Search } from 'lucide-react';

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
  const startingPrice = houseboat.startingPrice;

  return (
    <Link
      href={`/houseboats/${houseboat.id}`}
      className="block group h-full"
    >
      {/* Google Flights Style Card */}
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">

        {/* Image Section */}
        <div className="relative w-full h-40 overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={houseboat.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        </div>

        {/* Content Section - Google Flights Style */}
        <div className="p-4 flex flex-col flex-grow">

          {/* Header Label */}
          <div className="text-xs text-gray-500 mb-1">
            {bedrooms ? `${bedrooms} Bedroom Houseboat` : 'Houseboat'}
          </div>

          {/* Large Price */}
          <div className="text-2xl font-normal text-gray-900 mb-2">
            {startingPrice ? (
              <>€{startingPrice}</>
            ) : (
              <span className="text-lg">View prices</span>
            )}
          </div>

          {/* Details Row - Like "Iberia · 1 stop · 15 hrs" */}
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{optimalCapacity}–{maxCapacity} guests</span>
            <span className="mx-1">·</span>
            <span>{bedrooms || 1} {bedrooms === 1 ? 'room' : 'rooms'}</span>
          </div>

          {/* Description */}
          {houseboat.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-grow">
              {houseboat.description}
            </p>
          )}

          {/* View Link - Google Flights Style */}
          <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium mt-auto pt-2">
            <Search className="w-4 h-4" />
            <span>View houseboat</span>
          </div>

        </div>

      </div>
    </Link>
  );
}