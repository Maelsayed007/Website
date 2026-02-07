
import placeholderData from './placeholder-images.json';
import type { DateRange } from 'react-day-picker';
import { Wifi, Tv, CookingPot, AirVent, Thermometer, Flame, Sun, LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

const PlaceHolderImages = placeholderData.placeholderImages;

import { Amenity, HouseboatModel, Houseboat, Tariff, TariffPeriod, HouseboatModelPrice, Booking } from './types';

export const amenityDetails: Record<Amenity, { name: string; icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>> }> = {
  wifi: { name: 'Wi-Fi', icon: Wifi },
  tv: { name: 'TV', icon: Tv },
  kitchen: { name: 'Full Kitchen', icon: CookingPot },
  ac: { name: 'Air Conditioning', icon: AirVent },
  heating: { name: 'Heating', icon: Thermometer },
  grill: { name: 'BBQ Grill', icon: Flame },
  'sun-deck': { name: 'Sun Deck', icon: Sun },
};


// This data is now for demonstration on the public site, not for seeding.
// The dashboard will manage the live data in Firestore.
export const houseboats: (HouseboatModel & { slug: string, capacity: number, images: string[], price: { weekday: number, weekend: number } })[] = [
  {
    id: 'serenity-yacht',
    slug: 'serenity-yacht',
    name: 'Serenity Yacht',
    description: 'A luxurious yacht offering unparalleled comfort and breathtaking views. Perfect for a romantic getaway or a small family adventure.',
    capacity: 4,
    optimalCapacity: 4,
    maximumCapacity: 6,
    bedrooms: 2,
    bathrooms: 1,
    kitchens: 1,
    singleBeds: 0,
    doubleBeds: 2,
    price: { weekday: 350, weekend: 400 },
    imageUrls: [
      PlaceHolderImages.find(p => p.id === 'houseboat-exterior-1')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-1')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-2')?.imageUrl || '',
    ].filter(Boolean),
    images: [], // for compatibility
    amenities: ['wifi', 'tv', 'kitchen', 'ac', 'sun-deck'],
  },
  {
    id: 'aqua-haven',
    slug: 'aqua-haven',
    name: 'Aqua Haven',
    description: 'Spacious and modern, the Aqua Haven is designed for families and groups. Enjoy the large sun deck and fully equipped kitchen.',
    capacity: 8,
    optimalCapacity: 8,
    maximumCapacity: 10,
    bedrooms: 4,
    bathrooms: 2,
    kitchens: 1,
    singleBeds: 4,
    doubleBeds: 2,
    price: { weekday: 500, weekend: 575 },
    imageUrls: [
      PlaceHolderImages.find(p => p.id === 'houseboat-exterior-2')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-2')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-3')?.imageUrl || '',
    ].filter(Boolean),
    images: [],
    amenities: ['wifi', 'tv', 'kitchen', 'ac', 'heating', 'grill', 'sun-deck'],
  },
  {
    id: 'cozy-cruiser',
    slug: 'cozy-cruiser',
    name: 'Cozy Cruiser',
    description: 'The perfect choice for couples. This compact houseboat has everything you need for a memorable and intimate experience on the water.',
    capacity: 2,
    optimalCapacity: 2,
    maximumCapacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    kitchens: 1,
    singleBeds: 0,
    doubleBeds: 1,
    price: { weekday: 250, weekend: 290 },
    imageUrls: [
      PlaceHolderImages.find(p => p.id === 'houseboat-exterior-3')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-3')?.imageUrl || '',
      PlaceHolderImages.find(p => p.id === 'houseboat-interior-1')?.imageUrl || '',
    ].filter(Boolean),
    images: [],
    amenities: ['wifi', 'kitchen', 'heating', 'sun-deck'],
  },
  {
    id: 'the-voyager',
    slug: 'the-voyager',
    name: 'The Voyager',
    description: 'Built for exploration, The Voyager is a sturdy and comfortable vessel that allows you to discover every corner of the great lake.',
    capacity: 6,
    optimalCapacity: 6,
    maximumCapacity: 8,
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    singleBeds: 2,
    doubleBeds: 2,
    price: { weekday: 420, weekend: 480 },
    imageUrls: [
      'https://picsum.photos/seed/12/600/400',
      'https://picsum.photos/seed/13/600/400',
      'https://picsum.photos/seed/14/600/400',
    ],
    images: [],
    amenities: ['wifi', 'tv', 'kitchen', 'ac', 'heating', 'grill'],
  },
];

const today = new Date();

export const fullyBookedRestaurantDays = [
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11),
];

export type MenuItem = {
  category: string;
  items: {
    name: string;
    description: string;
    price: string;
  }[];
};

export const restaurantMenu: MenuItem[] = [
  {
    category: 'Appetizers',
    items: [
      { name: 'Grilled Alentejo Bread', description: 'With garlic, olive oil, and oregano.', price: '€4.50' },
      { name: 'Local Cheeses & Cured Meats', description: 'A selection of regional specialties.', price: '€12.00' },
      { name: 'Clams "Bulhão Pato" style', description: 'A Portuguese classic with garlic and cilantro.', price: '€14.00' },
    ],
  },
  {
    category: 'Main Courses',
    items: [
      { name: 'Grilled Black Pork "Secretos"', description: 'Served with asparagus migas and a black garlic sauce.', price: '€22.00' },
      { name: 'Codfish "à Brás"', description: 'Shredded cod with onions, crispy potatoes, and eggs.', price: '€19.50' },
      { name: 'Octopus "à Lagareiro"', description: 'Grilled octopus with smashed potatoes and olive oil.', price: '€24.00' },
      { name: 'Mushroom and Asparagus Risotto', description: 'Creamy risotto with seasonal wild mushrooms and green asparagus.', price: '€17.00' },
    ],
  },
  {
    category: 'Desserts',
    items: [
      { name: 'Sericaia with Elvas Plum', description: 'A traditional Alentejo dessert, a sweet egg pudding.', price: '€6.50' },
      { name: 'Chocolate Mousse', description: 'Rich dark chocolate mousse with a hint of orange.', price: '€7.00' },
      { name: 'Seasonal Fruit Platter', description: 'A selection of fresh, local fruits.', price: '€5.00' },
    ],
  },
];
