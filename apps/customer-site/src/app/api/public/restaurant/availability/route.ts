import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    evaluateRestaurantAvailability,
    getRestaurantBookingPolicy,
    toLisbonUtcDate,
    RESTAURANT_DEFAULT_DURATION_MINUTES,
} from '@/lib/booking-rules';

type AvailabilityRequest = {
    date: string;
    time: string;
    partySize: number;
    durationMinutes?: number;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as AvailabilityRequest;
        const date = body?.date;
        const time = body?.time;
        const partySize = Number(body?.partySize || 0);
        const durationMinutes = Math.max(
            30,
            Number(body?.durationMinutes || RESTAURANT_DEFAULT_DURATION_MINUTES)
        );

        if (!date || !time || !Number.isFinite(partySize) || partySize <= 0) {
            return NextResponse.json(
                {
                    available: false,
                    reason: 'invalid_input',
                    currentLoad: 0,
                    remainingCapacity: 70,
                },
                { status: 400 }
            );
        }

        const policy = getRestaurantBookingPolicy({ date, time, partySize });
        if (!policy.isOpenDay || !policy.isOpenTime) {
            const availability = evaluateRestaurantAvailability({
                date,
                time,
                partySize,
                durationMinutes,
                bookings: [],
            });
            return NextResponse.json({
                ...availability,
                policy,
                requiresManualReview: policy.requiresPreReservation,
            });
        }

        const supabase = createAdminClient();
        const dayStart = toLisbonUtcDate(date, '00:00');
        const dayEnd = toLisbonUtcDate(date, '23:59');

        if (!dayStart || !dayEnd) {
            return NextResponse.json(
                { available: false, reason: 'invalid_input', currentLoad: 0, remainingCapacity: 70 },
                { status: 400 }
            );
        }

        const { data: existingBookings, error } = await supabase
            .from('bookings')
            .select('start_time, end_time, number_of_guests')
            .lt('start_time', dayEnd.toISOString())
            .gt('end_time', dayStart.toISOString())
            .neq('status', 'Cancelled')
            .or('booking_type.eq.restaurant_reservation,restaurant_table_id.not.is.null,source.ilike.%Restaurant%');

        if (error) {
            return NextResponse.json(
                { error: 'Failed to evaluate restaurant availability.' },
                { status: 500 }
            );
        }

        const availability = evaluateRestaurantAvailability({
            date,
            time,
            partySize,
            durationMinutes,
            bookings: (existingBookings || []).map((booking: any) => ({
                startTime: booking.start_time,
                endTime: booking.end_time,
                guests: Number(booking.number_of_guests || 0),
            })),
        });

        return NextResponse.json({
            ...availability,
            policy,
            requiresManualReview: policy.requiresPreReservation,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Failed to evaluate restaurant availability.' },
            { status: 500 }
        );
    }
}
