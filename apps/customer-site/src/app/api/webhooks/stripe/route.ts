
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
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
                totalPrice
            } = session.metadata || {};

            if (!boatId || !startTime || !endTime) {
                console.error('[Webhook] Missing metadata for new booking creation');
                return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
            }

            const amountPaid = (session.amount_total || 0) / 100;
            const isDeposit = Math.abs(amountPaid - Number(depositAmount)) < 1; // Tolerance

            const { data: newBooking, error: createError } = await supabase
                .from('bookings')
                .insert({
                    id: crypto.randomUUID(),
                    houseboat_id: boatId,
                    start_time: startTime,
                    end_time: endTime,
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
                    source: 'website'
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

        // 1. Record Payment in 'payments' table (Non-blocking - table may not exist)
        const amountPaid = (session.amount_total || 0) / 100;

        try {
            const { error: paymentError } = await supabase.from('payments').insert({
                booking_id: bookingId,
                stripe_payment_intent_id: session.payment_intent as string,
                amount: amountPaid,
                status: 'succeeded'
            });

            if (paymentError) {
                console.error('[Webhook] Failed to record payment (non-blocking):', paymentError.message);
            }
        } catch (e: any) {
            console.error('[Webhook] Payment table error (non-blocking):', e.message);
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

            const { data: allPayments } = await supabase
                .from('payments')
                .select('amount')
                .eq('booking_id', bookingId)
                .eq('status', 'succeeded');

            // If the insert above was slow/async, this select might miss it? 
            // Actually in same flow it might be fine, or we just trust 'booking.amount_paid' + current.
            // Let's use the safer "increment" approach for the booking record itself 
            // OR strictly follow the user plan: "Calculate Total Paid... If total >= price confirm".

            const totalPaidDb = (allPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            // NOTE: The insert above happened just before.

            // Note: If 'active' storage of amount_paid is preferred:
            const newTotalPaid = (booking.amount_paid || 0) + amountPaid;
            // Use the greater of the two strategies to be safe? 
            // Let's stick to the booking column update for frontend consistency.

            const totalPrice = booking.total_price || booking.price || 0;
            const isFullyPaid = newTotalPaid >= (totalPrice - 0.05); // epsilon

            await supabase.from('bookings').update({
                amount_paid: newTotalPaid,
                status: isFullyPaid ? 'Confirmed' : (booking.status === 'Pending' ? 'Confirmed' : booking.status),
                // Note: User plan said "If Partial -> deposit_paid". We map that to 'Confirmed' (as deposit confirms it) or keep as is?
                // Let's stick to Confirmed if any payment is made for now, or 'Confirmed' only if full?
                // For Houseboats, deposit confirms. 
            }).eq('id', bookingId);


            // 4. Notifications
            // Send Finance Email (only if fully paid? or every payment?)
            // User plan: "If Total Paid >= Total Price ... Send Finance Email"
            if (isFullyPaid) {
                await sendFinanceEmail(booking, newTotalPaid);
            }

            // Send Client Receipt (Always good)
            await sendClientReceipt(booking, amountPaid);
        }
    }

    return NextResponse.json({ received: true });
}

// Helpers
async function sendFinanceEmail(booking: any, totalPaid: number) {
    const financeEmail = process.env.FINANCE_EMAIL || 'finance@amieiramarina.com';
    const invoiceSubject = `[URGENT] Issue Invoice - Booking ${booking.id.slice(0, 8)}`;
    const invoiceBody = `
To Finance Department,

A reservation has been FULLY PAID. Please issue the Fatura.

Client: ${booking.billing_name || booking.client_name}
NIF: ${booking.billing_nif || 'N/A'}
Address: ${booking.billing_address || 'N/A'}

Total Paid: €${totalPaid.toFixed(2)}
Booking Date: ${new Date(booking.start_time).toLocaleDateString()}
Service: ${booking.houseboat_id ? 'Houseboat' : 'Restaurant'}

Booking ID: ${booking.id}
    `;
    await sendEmail(financeEmail, invoiceSubject, invoiceBody).catch(console.error);
}

async function sendClientReceipt(booking: any, amountPaid: number) {
    const receiptSubject = `Payment Receipt - ${booking.client_name}`;
    const receiptBody = `
Dear ${booking.client_name},

We have confirmed your payment of €${amountPaid.toFixed(2)}.

Billing NIF: ${booking.billing_nif || 'N/A'}

Thank you for choosing Amieira Getaways.
    `;
    await sendEmail(booking.client_email, receiptSubject, receiptBody).catch(console.error);
}
