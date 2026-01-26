
// This file defines the types for data.

export type Amenity = 'wifi' | 'tv' | 'kitchen' | 'ac' | 'heating' | 'grill' | 'sun-deck';

export type HouseboatModel = {
  id: string;
  name: string;
  description?: string;
  optimal_capacity?: number;
  maximum_capacity?: number;
  optimalCapacity: number;
  maximumCapacity: number;
  kitchens: number;
  bathrooms: number;
  bedrooms: number;
  singleBeds: number;
  doubleBeds: number;
  amenities: Amenity[];
  imageUrls: string[];
  image_urls?: string[];
  slug?: string;
  // Computed Properties for UI
  pricePerNight?: number;
  totalPrice?: number;
  isAvailable?: boolean;
  breakdown?: {
    weekdayNights: number;
    weekdayPrice: number;
    weekendNights: number;
    weekendPrice: number;
    preparationFee: number;
    total: number;
    deposit: number;
  };
};

export type Houseboat = {
  id: string;
  name: string;
}

export type TariffPeriod = {
  start: string; // MM-DD
  end: string;   // MM-DD
};

export type Tariff = {
  id: string;
  name: string;
  periods: TariffPeriod[];
};

export type HouseboatModelPrice = {
  id?: string;
  tariffId: string;
  weekday: number;
  weekend: number;
};
