
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { LucideProps } from 'lucide-react';

export type Amenity = 'wifi' | 'tv' | 'kitchen' | 'ac' | 'heating' | 'grill' | 'sun-deck';

export interface HouseboatModel {
    id: string;
    name: string;
    description?: string;
    optimalCapacity: number;
    maximumCapacity: number;
    kitchens: number;
    bathrooms: number;
    bedrooms: number;
    singleBeds: number;
    doubleBeds: number;
    amenities: Amenity[];
    imageUrls: string[];
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
}

export interface Boat {
    id: string;
    name: string;
    model_id?: string;
    modelName?: string;
}

export interface TariffPeriod {
    start: string; // MM-DD
    end: string;   // MM-DD
}

export interface Tariff {
    id: string;
    name: string;
    periods: TariffPeriod[];
}

export interface HouseboatModelPrice {
    id?: string;
    tariffId: string;
    weekday: number;
    weekend: number;
}

export interface Booking {
    id: string;
    clientName: string;
    startTime: string;
    endTime: string;
    status: 'Confirmed' | 'Pending' | 'Maintenance' | 'Cancelled';
    source?: string;
    clientPhone?: string;
    clientEmail?: string;
    notes?: string;
    price?: number;
    discount?: number;
    amount_paid?: number; // Added from DB
    payment_status?: 'unpaid' | 'deposit_paid' | 'fully_paid' | 'failed'; // Added from DB
    initialPaymentAmount?: number;
    initialPaymentMethod?: string;
    extras?: { id: string; name: string; price: number; quantity?: number }[];
    houseboatId?: string;
    restaurantTableId?: string;
    dailyTravelPackageId?: string;
    numberOfGuests?: number;
    guestDetails?: GuestDetail[];
    totalPrice?: number;
    // Billing & Payment Link
    billing_nif?: string;
    billing_name?: string;
    billing_address?: string;
    email_sent?: boolean;
}

export interface PaymentTransaction {
    id: string;
    booking_id: string;
    amount: number;
    method: 'cash' | 'card' | 'transfer' | 'stripe' | 'other';
    reference?: string;
    notes?: string;
    created_at: string;
}

export interface WebsiteSettings {
    company_name: string;
    logoUrl: string;
    email: string;
    restaurant_email?: string;
    phone: string;
    phone_alt?: string;
    working_hours?: string;
    address: string;
    social_links: {
        tiktok?: string;
        facebook?: string;
        instagram?: string;
    };
    payment_instructions?: string;
    pdf_terms?: string;
    pdf_details?: string;
}

export interface RestaurantMenuPackage {
    id: string;
    name: string;
    description: string;
    prices: {
        adult: number;
        child: number;
    };
    is_active: boolean;
}

export interface GuestDetail {
    name?: string;
    ageGroup: 'adult' | 'child';
    menuPackageId?: string;
    price?: number;
    quantity: number;
}

export type AmenityDetail = {
    name: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
};
