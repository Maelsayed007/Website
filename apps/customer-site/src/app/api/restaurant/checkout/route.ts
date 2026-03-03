import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    calculateRestaurantTotalFromAgeBreakdown,
    evaluateRestaurantAvailability,
    getRestaurantBookingPolicy,
    toLisbonUtcDate,
    RESTAURANT_DEFAULT_DURATION_MINUTES,
} from '@/lib/booking-rules';

type CheckoutRequestBody = {
    date: string;
    time: string;
    menuId: string;
    clientDetails: {
        name: string;
        email: string;
        phone?: string;
        nif?: string;
        address?: string;
    };
    ageBreakdown: {
        adults: number;
        children: number;
        seniors: number;
    };
    durationMinutes?: number;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CheckoutRequestBody;
        const { date, time, menuId, clientDetails, ageBreakdown, durationMinutes } = body;

        if (!date || !time || !menuId) {
            return NextResponse.json(
                { error: 'date, time, and menuId are required.' },
                { status: 400 }
            );
        }

        if (!clientDetails?.name || !clientDetails?.email) {
            return NextResponse.json(
                { error: 'Client name and email are required.' },
                { status: 400 }
            );
        }

        const adults = Number(ageBreakdown?.adults || 0);
        const children = Number(ageBreakdown?.children || 0);
        const seniors = Number(ageBreakdown?.seniors || 0);
        const partySize = adults + children + seniors;

        if (!Number.isFinite(partySize) || partySize <= 0) {
            return NextResponse.json(
                { error: 'At least one guest is required.' },
                { status: 400 }
            );
        }

        const policy = getRestaurantBookingPolicy({ date, time, partySize });
        if (!policy.isOpenDay) {
            return NextResponse.json(
                {
                    error: 'Restaurant is closed on this day. Open days are Thursday to Monday.',
                    policy,
                },
                { status: 400 }
            );
        }

        if (!policy.isOpenTime) {
            return NextResponse.json(
                {
                    error: 'Restaurant only accepts reservations from 12:00 to 16:30 (Europe/Lisbon).',
                    policy,
                },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        const requestStart = toLisbonUtcDate(date, time);
        if (!requestStart) {
            return NextResponse.json({ error: 'Invalid date or time format.' }, { status: 400 });
        }

        const effectiveDuration = Math.max(30, Number(durationMinutes || RESTAURANT_DEFAULT_DURATION_MINUTES));
        const requestEnd = new Date(requestStart.getTime() + (effectiveDuration * 60 * 1000));

        const dayStart = toLisbonUtcDate(date, '00:00');
        const dayEnd = toLisbonUtcDate(date, '23:59');
        if (!dayStart || !dayEnd) {
            return NextResponse.json({ error: 'Invalid reservation date.' }, { status: 400 });
        }

        const { data: existingBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('start_time, end_time, number_of_guests')
            .lt('start_time', dayEnd.toISOString())
            .gt('end_time', dayStart.toISOString())
            .neq('status', 'Cancelled')
            .or('booking_type.eq.restaurant_reservation,restaurant_table_id.not.is.null,source.ilike.%Restaurant%');

        if (bookingsError) {
            return NextResponse.json(
                { error: 'Failed to check restaurant capacity.' },
                { status: 500 }
            );
        }

        const availability = evaluateRestaurantAvailability({
            date,
            time,
            partySize,
            durationMinutes: effectiveDuration,
            bookings: (existingBookings || []).map((booking: any) => ({
                startTime: booking.start_time,
                endTime: booking.end_time,
                guests: Number(booking.number_of_guests || 0),
            })),
        });

        if (!availability.available && availability.reason === 'capacity_exceeded') {
            return NextResponse.json(
                {
                    error: 'Restaurant capacity exceeded for this time slot.',
                    availability,
                    policy,
                },
                { status: 409 }
            );
        }

        if (!availability.available) {
            return NextResponse.json(
                {
                    error: 'Selected slot is not available.',
                    availability,
                    policy,
                },
                { status: 400 }
            );
        }

        const { data: menu, error: menuError } = await supabase
            .from('restaurant_menus')
            .select('id, name, price_adult, price_child, price_senior')
            .eq('id', menuId)
            .eq('is_active', true)
            .single();

        if (menuError || !menu) {
            return NextResponse.json(
                { error: 'Selected menu is not available.' },
                { status: 400 }
            );
        }

        const totalPrice = calculateRestaurantTotalFromAgeBreakdown({
            priceAdult: Number(menu.price_adult || 0),
            priceChild: Number(menu.price_child || 0),
            priceSenior: Number(menu.price_senior || menu.price_adult || 0),
            adults,
            children,
            seniors,
        });

        if (totalPrice <= 0) {
            return NextResponse.json(
                { error: 'Total price is invalid for the selected menu and guest breakdown.' },
                { status: 400 }
            );
        }

        const depositAmount = Math.round(totalPrice * 0.3 * 100) / 100;
        const unitAmount = Math.round(depositAmount * 100);

        const guestDetails = [
            { ageGroup: 'adult', quantity: adults, price: Number(menu.price_adult || 0) },
            { ageGroup: 'child', quantity: children, price: Number(menu.price_child || 0) },
            { ageGroup: 'senior', quantity: seniors, price: Number(menu.price_senior || menu.price_adult || 0) },
        ];

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            automatic_payment_methods: { enabled: true },
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Restaurant Reservation: ${menu.name}`,
                            description: `30% deposit • ${date} ${time} • ${partySize} guests`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/restaurant?canceled=true`,
            metadata: {
                bookingType: 'restaurant_reservation',
                menuId: menu.id,
                menuName: menu.name,
                startDate: date,
                startTime: requestStart.toISOString(),
                displayTime: time,
                endTime: requestEnd.toISOString(),
                reservationStartTime: requestStart.toISOString(),
                reservationEndTime: requestEnd.toISOString(),
                startTimeUtc: requestStart.toISOString(),
                endTimeUtc: requestEnd.toISOString(),
                numberOfGuests: String(partySize),
                adults: String(adults),
                children: String(children),
                seniors: String(seniors),
                guestDetails: JSON.stringify(guestDetails),
                clientName: clientDetails.name,
                clientEmail: clientDetails.email,
                clientPhone: clientDetails.phone || '',
                billingNif: clientDetails.nif || '',
                billingAddress: clientDetails.address || '',
                totalPrice: String(totalPrice),
                depositAmount: String(depositAmount),
                paymentOption: 'deposit',
                requiresManualReview: policy.requiresPreReservation ? 'true' : 'false',
            },
            customer_email: clientDetails.email,
        } as any);

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
            totalPrice,
            depositAmount,
            policy,
            availability,
            requiresManualReview: policy.requiresPreReservation,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
