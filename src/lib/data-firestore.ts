
// This file defines the types for data.

export type Amenity = 'wifi' | 'tv' | 'kitchen' | 'ac' | 'heating' | 'grill' | 'sun-deck';

export type HouseboatModel = {
  id: string;
  name: string;
  description: string;
  optimalCapacity: number;
  maximumCapacity: number;
  kitchens: number;
  bathrooms: number;
  bedrooms: number;
  singleBeds: number;
  doubleBeds: number;
  amenities: Amenity[];
  imageUrls: string[];
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
