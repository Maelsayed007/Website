
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
    sendAccountingEmail,
    sendClientReceipt,
    sendStaffPaymentFailedEmail
} from '@/lib/email';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error('Webhook signature failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Handle expired/failed checkout sessions
    if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        const tokenId = session.metadata?.tokenId;

        console.log(`[Webhook] Checkout session expired for Booking ${bookingId}`);

        if (bookingId) {
            // Update booking payment status to failed
            await supabase.from('bookings').update({
                payment_status: 'failed'
            }).eq('id', bookingId);

            // Get booking details for notification
            const { data: booking } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();

            if (booking) {
                // Notify staff about failed payment
                await sendStaffPaymentFailedEmail(booking, session);
            }
        }

        // Mark token as expired/failed if applicable
        if (tokenId) {
            await supabase.from('payment_tokens').update({
                used_at: new Date().toISOString() // Mark as used so it can't be retried
            }).eq('id', tokenId);
        }

        return NextResponse.json({ received: true });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        let bookingId = session.metadata?.bookingId;
        const tokenId = session.metadata?.tokenId;

        // NEW: Handle creation of new booking if not present (Main Website Flow via Stripe Hosted Checkout)
        if (!bookingId) {
            console.log('[Webhook] New Reservation detected. Creating booking...');

            const {
                boatId,
                startTime,
                endTime,
                clientName,
                clientEmail,
                clientPhone,
                billingNif,
                billingAddress,
                numberOfGuests,
                depositAmount,
                totalPrice,
                bookingType,
                menuId,
                guestDetails,
                restaurantTableId
            } = session.metadata || {};

            // Validation: Require either boatId OR menuId (for restaurant)
            if ((!boatId && !menuId) || !startTime) {
                console.error('[Webhook] Missing required metadata for new booking creation');
                return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
            }

            const amountPaid = (session.amount_total || 0) / 100;
            const isDeposit = Math.abs(amountPaid - Number(depositAmount)) < 1; // Tolerance

            // Parse Guest Details if Restaurant
            let parsedGuestDetails: any[] = [];
            if (guestDetails) {
                try {
                    parsedGuestDetails = JSON.parse(guestDetails);
                    // Ensure menuId is attached to details if not present
                    if (menuId) {
                        parsedGuestDetails = parsedGuestDetails.map((gd: any) => ({
                            ...gd,
                            menuId: gd.menuId || menuId
                        }));
                    }
                } catch (e) {
                    console.error('Failed to parse guestDetails', e);
                }
            }

            const { data: newBooking, error: createError } = await supabase
                .from('bookings')
                .insert({
                    id: crypto.randomUUID(),
                    houseboat_id: boatId || null,
                    restaurant_table_id: restaurantTableId || (menuId ? 'auto' : null),
                    start_time: startTime, // Note: Stripe metadata converts to string, ensure ISO format was sent
                    end_time: endTime || (menuId ? new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString() : null), // Default 2h duration for restaurant if unused
                    client_name: clientName || session.customer_details?.name || 'Guest',
                    client_email: clientEmail || session.customer_details?.email,
                    client_phone: clientPhone,
                    status: 'Confirmed', // Paid implies confirmed
                    payment_status: isDeposit ? 'deposit_paid' : 'fully_paid',
                    amount_paid: amountPaid,
                    total_price: Number(totalPrice),
                    number_of_guests: Number(numberOfGuests) || 2,
                    billing_nif: billingNif || null,
                    billing_address: billingAddress || null,
                    billing_name: clientName || null,
                    source: 'website',
                    booking_type: bookingType || (boatId ? 'overnight' : 'restaurant_reservation'),
                    guest_details: parsedGuestDetails.length > 0 ? parsedGuestDetails : null
                })
                .select()
                .single();

            if (createError || !newBooking) {
                console.error('[Webhook] Failed to create new booking:', createError);
                return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
            }

            console.log(`[Webhook] Created new booking: ${newBooking.id}`);
            bookingId = newBooking.id;
        }

        console.log(`[Webhook] Processing Payment for Booking ${bookingId}`);

        // 1. Record Payment in 'payments' table
        const amountPaid = (session.amount_total || 0) / 100;
        let paymentMetadata = {};

        try {
            // Retrieve PaymentIntent to get payment method details
            if (session.payment_intent) {
                const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
                    expand: ['payment_method']
                });
                const pm = pi.payment_method as Stripe.PaymentMethod;

                if (pm) {
                    let methodLabel: string = pm.type;
                    if (pm.type === 'card') {
                        methodLabel = `${pm.card?.brand?.toUpperCase()} ••• ${pm.card?.last4}`;
                    } else if (pm.type === 'mb_way') {
                        methodLabel = 'MB WAY';
                    } else if (pm.type === 'multibanco') {
                        methodLabel = 'Multibanco';
                    }

                    paymentMetadata = {
                        stripe_payment_method_id: pm.id,
                        stripe_type: pm.type,
                        card_brand: pm.card?.brand,
                        last4: pm.card?.last4,
                        wallet: pm.card?.wallet?.type,
                        details: methodLabel
                    };
                }
            }

            const { error: paymentError } = await supabase.from('payments').insert({
                booking_id: bookingId,
                stripe_payment_intent_id: session.payment_intent as string,
                amount: amountPaid,
                status: 'succeeded',
                method: 'stripe',
                reference: session.payment_intent as string,
                metadata: paymentMetadata
            });

            if (paymentError) {
                console.error('[Webhook] Failed to record payment (non-blocking):', paymentError.message);
            }

            // ALSO: Record in payment_transactions for the new premium history board
            // Fetch billing info from booking if available
            const { data: bookingData } = await supabase
                .from('bookings')
                .select('billing_name, billing_nif, billing_address')
                .eq('id', bookingId)
                .single();

            const { error: transError } = await supabase.from('payment_transactions').insert({
                booking_id: bookingId,
                amount: amountPaid,
                method: (paymentMetadata as any).details || 'Stripe',
                status: 'completed',
                reference: session.payment_intent as string,
                type: 'payment',
                billing_name: bookingData?.billing_name || null,
                billing_nif: bookingData?.billing_nif || null,
                billing_address: bookingData?.billing_address || null,
                needs_invoice: !!(bookingData?.billing_nif),
                invoice_status: !!(bookingData?.billing_nif) ? 'pending' : 'ignored'
            });

            if (transError) {
                console.error('[Webhook] Failed to log to payment_transactions:', transError.message);
            }
        } catch (e: any) {
            console.error('[Webhook] Payment logging error:', e.message);
        }

        // 2. Mark Token Used (if applicable)
        if (tokenId) {
            await supabase.from('payment_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenId);
        }

        // 3. Update Booking Balance & Status
        // First get current booking state
        const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (booking) {
            // We can calculate total paid from the payments table to be more robust, 
            // but for now let's increment atomicly or re-sum.
            // Let's re-sum from payments table for "Source of Truth" as per user plan.

            // Note: If 'active' storage of amount_paid is preferred:
            const newTotalPaid = (booking.amount_paid || 0) + amountPaid;
            // Use the greater of the two strategies to be safe? 
            // Let's stick to the booking column update for frontend consistency.

            const totalPrice = booking.total_price || booking.price || 0;
            const isFullyPaid = newTotalPaid >= (totalPrice - 0.05);
            const isDepositPaid = newTotalPaid >= (totalPrice * 0.3);
            const paymentStatus = isFullyPaid ? 'fully_paid' : (isDepositPaid ? 'deposit_paid' : 'unpaid');

            let newStatus = booking.status;
            if (booking.source !== 'external') {
                if (isFullyPaid || isDepositPaid) {
                    newStatus = 'Confirmed';
                }
            }

            await supabase.from('bookings').update({
                amount_paid: newTotalPaid,
                payment_status: paymentStatus,
                status: newStatus,
            }).eq('id', bookingId);


            // 4. Notifications
            // Send Accounting Email on EVERY successful payment (per user plan)
            await sendAccountingEmail(booking, amountPaid, newTotalPaid, totalPrice, session);

            // Send Client Receipt (Always good)
            await sendClientReceipt(booking, amountPaid);
        }
    }

    return NextResponse.json({ received: true });
}
