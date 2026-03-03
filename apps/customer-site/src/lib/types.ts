
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
    diaria_enabled: boolean;
    diaria_price: number;
    diaria_description: string;
    translations?: Record<string, any>;
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
    booking_type: 'overnight' | 'day_charter';
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
    riverCruisePackageId?: string;
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
    status?: string;
    reference?: string;
    ref?: string; // Add ref as alias for compatibility
    invoice_ref?: string;
    invoice_status?: 'pending' | 'issued' | 'ignored';
    notes?: string;
    accountant_notes?: string;
    created_at: string;
}

export interface WebsiteSettings {
    company_name: string;
    logoUrl: string;
    heroImageUrl?: string;
    restaurantHeroImageUrl?: string;
    homeHouseboatsImageUrl?: string;
    homeRiverCruiseImageUrl?: string;
    homeRestaurantImageUrl?: string;
    home_houseboats_image_url?: string;
    home_river_cruise_image_url?: string;
    home_restaurant_image_url?: string;
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
    translations?: Record<string, any>;
}

export interface GuestDetail {
    name?: string;
    ageGroup: 'adult' | 'child';
    menuPackageId?: string;
    menuId?: string;
    price?: number;
    quantity: number;
}

export type AmenityDetail = {
    name: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
};

export interface RiverCruiseAgePricing {
    withoutFood: number;
    withFood: number;
    minAge: number;
    maxAge?: number;
}

export interface RiverCruisePricing {
    type: 'per-person' | 'exclusive';
    adults: RiverCruiseAgePricing;
    children: RiverCruiseAgePricing;
    seniors: RiverCruiseAgePricing;
    totalPrice?: number;
}

export interface RiverCruisePackage {
    id: string;
    name: string;
    description?: string;
    destination?: string;
    duration_hours: number;
    photo_url?: string;
    pricing: RiverCruisePricing;
    min_capacity: number;
    preparation_buffer?: number;
    is_active: boolean;
    translations?: Record<string, any>;
    created_at?: string;
}

export interface DailyBoat {
    id: string;
    name: string;
    max_capacity: number;
    min_capacity: number;
    boat_type: 'large_vessel' | 'houseboat';
    photo_url?: string;
}

export interface RestaurantPhoto {
    id: string;
    image_url: string;
    caption?: string;
    sort_order: number;
    created_at?: string;
}

export interface SiteGalleryItem {
    id: string;
    image_url: string;
    category: 'houseboat' | 'scenery' | 'restaurant' | 'hero' | 'lake' | 'interior';
    alt_text?: string;
    sort_order: number;
    created_at?: string;
}

export interface SpecialOffer {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    badge_text?: string;
    badge_icon?: 'tag' | 'gift' | 'percent';
    category: 'houseboat' | 'package' | 'service';
    category_icon: 'gift' | 'users' | 'clock' | 'ship' | 'utensils' | 'waves';
    category_color: 'pink' | 'blue' | 'amber';
    original_price_text?: string;
    current_price_text: string;
    unit_text: string;
    button_text: string;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    conditions?: {
        min_nights?: number;
        max_nights?: number;
        allowed_models?: string[];
        allowed_boats?: string[];
        start_date?: string;
        end_date?: string;
        min_boats?: number;
        days_in_advance?: number;
        min_people?: number;
        max_people?: number;
    };
    is_dark_theme?: boolean;
    image_url?: string;
    linked_package_id?: string;
    use_manual_pricing?: boolean;
    manual_adult_price?: number;
    manual_child_price?: number;
    manual_senior_price?: number;
    is_active?: boolean;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
    translations?: Record<string, any>;
}

export interface RestaurantAvailabilityResult {
    available: boolean;
    reason: 'ok' | 'closed_day' | 'closed_time' | 'capacity_exceeded' | 'invalid_input';
    currentLoad: number;
    remainingCapacity: number;
    projectedLoad: number;
    maxCapacity: number;
}

export interface RestaurantBookingPolicyResult {
    isOpenDay: boolean;
    isOpenTime: boolean;
    requiresPreReservation: boolean;
    serviceWindow: {
        start: string;
        end: string;
        timezone: string;
        openDays: string[];
    };
}

export interface RiverCruiseEligibilityResult {
    mode: 'inquiry' | 'payable';
    eligibleForCheckout: boolean;
    minGuestsForCheckout: number;
    guestCount: number;
    reason: string;
}

export interface HouseboatRecurringDiscountResult {
    applies: boolean;
    earlyBookingApplied: boolean;
    groupSizeApplied: boolean;
    longStayApplied: boolean;
    discountPercent: number;
    discountedBasePrice: number;
    discountAmount: number;
}

export interface HeroBadgeItem {
    key: string;
    label: string;
    icon?: string;
}

export interface HomepageVoucherItem {
    id: string;
    title: string;
    rule: string;
    ctaLabel: string;
    ctaHref: string;
    promoCode?: string;
}

export interface HomepagePrimaryCta {
    label: string;
    href?: string;
    action?: 'scroll' | 'route';
    description?: string;
}
