import { addMinutes, addMonths, isAfter, isEqual } from 'date-fns';
import type {
    HouseboatRecurringDiscountResult,
    RestaurantAvailabilityResult,
    RestaurantBookingPolicyResult,
    RiverCruiseEligibilityResult,
} from '@/lib/types';

export const RESTAURANT_TIMEZONE = 'Europe/Lisbon';
export const RESTAURANT_OPEN_DAYS = [0, 1, 4, 5, 6] as const; // Sun, Mon, Thu, Fri, Sat
export const RESTAURANT_OPEN_TIME = '12:00';
export const RESTAURANT_CLOSE_TIME = '16:30';
export const RESTAURANT_MAX_HOURLY_CAPACITY = 70;
export const RESTAURANT_DEFAULT_DURATION_MINUTES = 120;
export const RIVER_CRUISE_MIN_PAYABLE_GUESTS = 20;

const OPEN_DAY_LABELS = ['Sunday', 'Monday', 'Thursday', 'Friday', 'Saturday'];

type TimeWindowInput = {
    date: string;
    time: string;
};

type RestaurantBookingWindow = {
    startTime: Date | string;
    endTime: Date | string;
    guests: number;
};

type LisbonDateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
};

function parseDateParts(date: string): { year: number; month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
}

function parseTimeToMinutes(time: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return (hours * 60) + minutes;
}

function getWeekdayFromDate(date: string): number | null {
    const parsed = parseDateParts(date);
    if (!parsed) return null;
    const value = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    return value.getUTCDay();
}

function getZonedDateParts(date: Date, timeZone: string): LisbonDateParts {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const map: Record<string, string> = {};
    formatter.formatToParts(date).forEach((part) => {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    });

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
    };
}

function localPartsToUtcMs(parts: LisbonDateParts): number {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
    const dateParts = parseDateParts(date);
    const timeMinutes = parseTimeToMinutes(time);
    if (!dateParts || timeMinutes === null) return null;

    const desired: LisbonDateParts = {
        ...dateParts,
        hour: Math.floor(timeMinutes / 60),
        minute: timeMinutes % 60,
    };

    let guess = new Date(localPartsToUtcMs(desired));

    for (let i = 0; i < 3; i += 1) {
        const zoned = getZonedDateParts(guess, timeZone);
        const deltaMinutes = Math.round((localPartsToUtcMs(zoned) - localPartsToUtcMs(desired)) / 60000);
        if (deltaMinutes === 0) break;
        guess = new Date(guess.getTime() - (deltaMinutes * 60000));
    }

    return guess;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && aEnd > bStart;
}

export function getRestaurantBookingPolicy({ date, time, partySize }: { date: string; time: string; partySize: number }): RestaurantBookingPolicyResult {
    const weekday = getWeekdayFromDate(date);
    const requestedMinutes = parseTimeToMinutes(time);
    const openStart = parseTimeToMinutes(RESTAURANT_OPEN_TIME) ?? 0;
    const openEnd = parseTimeToMinutes(RESTAURANT_CLOSE_TIME) ?? (24 * 60);

    return {
        isOpenDay: weekday !== null && RESTAURANT_OPEN_DAYS.includes(weekday as any),
        isOpenTime: requestedMinutes !== null && requestedMinutes >= openStart && requestedMinutes <= openEnd,
        requiresPreReservation: partySize > 6,
        serviceWindow: {
            start: RESTAURANT_OPEN_TIME,
            end: RESTAURANT_CLOSE_TIME,
            timezone: RESTAURANT_TIMEZONE,
            openDays: OPEN_DAY_LABELS,
        },
    };
}

export function evaluateRestaurantAvailability(params: {
    date: string;
    time: string;
    partySize: number;
    bookings: RestaurantBookingWindow[];
    durationMinutes?: number;
    maxHourlyCapacity?: number;
}): RestaurantAvailabilityResult {
    const {
        date,
        time,
        partySize,
        bookings,
        durationMinutes = RESTAURANT_DEFAULT_DURATION_MINUTES,
        maxHourlyCapacity = RESTAURANT_MAX_HOURLY_CAPACITY,
    } = params;

    if (!Number.isFinite(partySize) || partySize <= 0) {
        return {
            available: false,
            reason: 'invalid_input',
            currentLoad: 0,
            remainingCapacity: maxHourlyCapacity,
            projectedLoad: 0,
            maxCapacity: maxHourlyCapacity,
        };
    }

    const policy = getRestaurantBookingPolicy({ date, time, partySize });
    if (!policy.isOpenDay) {
        return {
            available: false,
            reason: 'closed_day',
            currentLoad: 0,
            remainingCapacity: maxHourlyCapacity,
            projectedLoad: partySize,
            maxCapacity: maxHourlyCapacity,
        };
    }
    if (!policy.isOpenTime) {
        return {
            available: false,
            reason: 'closed_time',
            currentLoad: 0,
            remainingCapacity: maxHourlyCapacity,
            projectedLoad: partySize,
            maxCapacity: maxHourlyCapacity,
        };
    }

    const requestStart = zonedDateTimeToUtc(date, time, RESTAURANT_TIMEZONE);
    if (!requestStart) {
        return {
            available: false,
            reason: 'invalid_input',
            currentLoad: 0,
            remainingCapacity: maxHourlyCapacity,
            projectedLoad: 0,
            maxCapacity: maxHourlyCapacity,
        };
    }

    const requestEnd = addMinutes(requestStart, durationMinutes);
    const normalizedBookings = bookings
        .map((booking) => {
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);
            const guests = Number(booking.guests || 0);
            return { start, end, guests };
        })
        .filter((booking) =>
            Number.isFinite(booking.guests) &&
            booking.guests > 0 &&
            !Number.isNaN(booking.start.getTime()) &&
            !Number.isNaN(booking.end.getTime()) &&
            booking.end > booking.start
        );

    const candidateWindowStarts = new Set<number>();
    const addCandidate = (dateValue: Date) => candidateWindowStarts.add(dateValue.getTime());

    for (let t = requestStart.getTime() - (60 * 60000); t <= requestEnd.getTime(); t += 15 * 60000) {
        candidateWindowStarts.add(t);
    }

    addCandidate(requestStart);
    addCandidate(addMinutes(requestEnd, -60));

    normalizedBookings.forEach((booking) => {
        addCandidate(booking.start);
        addCandidate(addMinutes(booking.end, -60));
    });

    let currentLoad = 0;
    let projectedLoad = 0;

    candidateWindowStarts.forEach((windowStartMs) => {
        const windowStart = new Date(windowStartMs);
        const windowEnd = addMinutes(windowStart, 60);

        let existing = 0;
        normalizedBookings.forEach((booking) => {
            if (overlaps(booking.start, booking.end, windowStart, windowEnd)) {
                existing += booking.guests;
            }
        });

        const includesRequest = overlaps(requestStart, requestEnd, windowStart, windowEnd);
        const projected = existing + (includesRequest ? partySize : 0);

        currentLoad = Math.max(currentLoad, existing);
        projectedLoad = Math.max(projectedLoad, projected);
    });

    const remainingCapacity = Math.max(0, maxHourlyCapacity - projectedLoad);
    const available = projectedLoad <= maxHourlyCapacity;

    return {
        available,
        reason: available ? 'ok' : 'capacity_exceeded',
        currentLoad,
        remainingCapacity,
        projectedLoad,
        maxCapacity: maxHourlyCapacity,
    };
}

export function getRiverCruiseEligibility(guestCount: number, minGuestsForCheckout = RIVER_CRUISE_MIN_PAYABLE_GUESTS): RiverCruiseEligibilityResult {
    if (!Number.isFinite(guestCount) || guestCount <= 0) {
        return {
            mode: 'inquiry',
            eligibleForCheckout: false,
            minGuestsForCheckout,
            guestCount,
            reason: 'Invalid guest count',
        };
    }

    if (guestCount < minGuestsForCheckout) {
        return {
            mode: 'inquiry',
            eligibleForCheckout: false,
            minGuestsForCheckout,
            guestCount,
            reason: `Groups under ${minGuestsForCheckout} guests are handled as inquiry requests.`,
        };
    }

    return {
        mode: 'payable',
        eligibleForCheckout: true,
        minGuestsForCheckout,
        guestCount,
        reason: 'Eligible for direct booking checkout.',
    };
}

export function applyHouseboatRecurringDiscount(params: {
    bookingType: 'overnight' | 'day_charter';
    baseOvernightPrice: number;
    bookingDate: Date;
    checkInDate: Date;
    guests: number;
    nights?: number;
}): HouseboatRecurringDiscountResult {
    const { bookingType, baseOvernightPrice, bookingDate, checkInDate, guests, nights = 0 } = params;

    if (bookingType !== 'overnight' || !Number.isFinite(baseOvernightPrice) || baseOvernightPrice <= 0) {
        return {
            applies: false,
            earlyBookingApplied: false,
            groupSizeApplied: false,
            longStayApplied: false,
            discountPercent: 0,
            discountedBasePrice: Math.max(0, baseOvernightPrice || 0),
            discountAmount: 0,
        };
    }

    const minAdvanceDate = addMonths(bookingDate, 5);
    const earlyBookingApplied = isAfter(checkInDate, minAdvanceDate) || isEqual(checkInDate, minAdvanceDate);
    const groupSizeApplied = guests > 5;
    const longStayApplied = Number.isFinite(nights) && nights >= 5;
    const discountPercent = Math.min(
        20,
        (earlyBookingApplied ? 10 : 0) + (groupSizeApplied ? 10 : 0) + (longStayApplied ? 10 : 0)
    );
    const discountAmount = (baseOvernightPrice * discountPercent) / 100;
    const discountedBasePrice = Math.max(0, baseOvernightPrice - discountAmount);

    return {
        applies: discountPercent > 0,
        earlyBookingApplied,
        groupSizeApplied,
        longStayApplied,
        discountPercent,
        discountedBasePrice,
        discountAmount,
    };
}

export function calculateRestaurantTotalFromAgeBreakdown(params: {
    priceAdult: number;
    priceChild: number;
    priceSenior?: number;
    adults: number;
    children: number;
    seniors: number;
}): number {
    const {
        priceAdult,
        priceChild,
        priceSenior = priceAdult,
        adults,
        children,
        seniors,
    } = params;

    return (Math.max(0, adults) * Math.max(0, priceAdult))
        + (Math.max(0, children) * Math.max(0, priceChild))
        + (Math.max(0, seniors) * Math.max(0, priceSenior));
}

export function toLisbonUtcDate(date: string, time: string): Date | null {
    return zonedDateTimeToUtc(date, time, RESTAURANT_TIMEZONE);
}
