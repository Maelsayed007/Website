import { getDay, eachDayOfInterval, differenceInDays } from 'date-fns';

export interface PriceBreakdown {
    weekdayNights: number;
    weekdayPrice: number;
    weekendNights: number;
    weekendPrice: number;
    preparationFee: number;
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
    pricing: { weekday: number; weekend: number }
): PriceBreakdown {
    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) {
        return {
            weekdayNights: 0,
            weekdayPrice: pricing.weekday,
            weekendNights: 0,
            weekendPrice: pricing.weekend,
            preparationFee: 76,
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
        total,
        deposit: Math.ceil(total * 0.30)
    };
}
