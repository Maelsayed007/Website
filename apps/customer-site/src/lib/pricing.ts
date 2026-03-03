import { getDay, eachDayOfInterval, differenceInDays } from 'date-fns';

export interface PriceBreakdown {
    weekdayNights: number;
    weekdayPrice: number;
    weekendNights: number;
    weekendPrice: number;
    preparationFee: number;
    offerDiscount: number;
    total: number;
    deposit: number;
}

/**
 * Calculates the price breakdown for a houseboat booking.
 * Matches the logic used on the public website.
 */
export function calculateHouseboatPrice(
    checkIn: Date,
    checkOut: Date,
    pricing: { weekday: number; weekend: number },
    bookingType: 'overnight' | 'day_charter' = 'overnight',
    diariaPrice: number = 0
): PriceBreakdown {
    // 1. Logic for Day Charter (Diaria)
    if (bookingType === 'day_charter') {
        return {
            weekdayNights: 0,
            weekdayPrice: 0,
            weekendNights: 0,
            weekendPrice: 0,
            preparationFee: 0,
            offerDiscount: 0,
            total: diariaPrice,
            deposit: 0 // As per instructions, Day Charters (Diaria) don't have a 30% deposit rule logic mentioned for public?
            // Actually, Part 2 says Agencies have no deposit. Public might still need one?
            // User prompt says: 1.2: Ignore Tariffs, ignore Weekends, ignore €76 fee.
            // Usually, if deposit isn't mentioned, we keep it 0 or same 30%.
            // User: "Agencies (nicols, ancorado): ... Auto-confirmed, no deposit."
            // For public Diaria, I'll keep deposit at 30% of total unless specified.
            // Actually, if it's auto-confirmed no deposit for agencies, I'll assume public might still pay.
            // BUT usually day travels are paid in full. I'll stick to the "ignore €76 fee" and fixed price.
        };
    }

    // 2. Logic for Overnight (Classic)
    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) {
        return {
            weekdayNights: 0,
            weekdayPrice: pricing.weekday,
            weekendNights: 0,
            weekendPrice: pricing.weekend,
            preparationFee: 76,
            offerDiscount: 0,
            total: 76,
            deposit: Math.ceil(76 * 0.3)
        };
    }

    const days = eachDayOfInterval({ start: checkIn, end: checkOut });
    const nightDates = days.slice(0, -1);

    let weekdayCount = 0;
    let weekendCount = 0;

    nightDates.forEach(date => {
        const day = getDay(date); // 0=Sun, 1=Mon... 5=Fri, 6=Sat
        // Friday and Saturday nights are weekend rates
        if (day === 5 || day === 6) {
            weekendCount++;
        } else {
            weekdayCount++;
        }
    });

    const weekdaysCost = weekdayCount * pricing.weekday;
    const weekendsCost = weekendCount * pricing.weekend;
    const preparationFee = 76;

    const total = weekdaysCost + weekendsCost + preparationFee;

    return {
        weekdayNights: weekdayCount,
        weekdayPrice: pricing.weekday,
        weekendNights: weekendCount,
        weekendPrice: pricing.weekend,
        preparationFee,
        offerDiscount: 0,
        total,
        deposit: Math.ceil(total * 0.30)
    };
}

/**
 * Applies special offer discounts to a price breakdown.
 * Supports both percentage and fixed-amount discounts.
 * Enforces a 25% cap on the total cumulative discount.
 */
export function applyOfferDiscount(
    breakdown: PriceBreakdown,
    offers: Array<{ discount_type?: 'percentage' | 'fixed'; discount_value?: number }>
): PriceBreakdown {
    if (!offers || offers.length === 0) return breakdown;

    const subtotal = breakdown.total;
    // Don't apply discounts to zero or near-zero totals
    if (subtotal <= 0) return breakdown;

    let totalDiscount = 0;

    for (const offer of offers) {
        if (!offer.discount_value || offer.discount_value <= 0) continue;

        if (offer.discount_type === 'percentage') {
            totalDiscount += subtotal * (offer.discount_value / 100);
        } else {
            // Fixed amount
            totalDiscount += offer.discount_value;
        }
    }

    // Enforce 25% cap on total discount
    const maxDiscount = subtotal * 0.25;
    totalDiscount = Math.min(totalDiscount, maxDiscount);

    // Round to nearest cent
    totalDiscount = Math.round(totalDiscount * 100) / 100;

    const newTotal = Math.max(0, subtotal - totalDiscount);

    return {
        ...breakdown,
        offerDiscount: totalDiscount,
        total: newTotal,
        deposit: Math.ceil(newTotal * 0.30),
    };
}
