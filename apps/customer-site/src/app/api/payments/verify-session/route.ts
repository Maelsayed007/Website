
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const supabase = createAdminClient();

    try {
        const { sessionId, token } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        // 1. Verify Stripe Session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
        }

        let booking: any = null;

        // 2. Check which flow we're in
        if (token) {
            // --- PAYMENT LINK FLOW (token provided) ---
            const { data: tokenData, error: tokenError } = await supabase
                .from('payment_tokens')
                .select('*, bookings(*)')
                .eq('token', token)
                .single();

            if (tokenError || !tokenData) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
            }

            if (tokenData.used_at) {
                return NextResponse.json({ success: true, message: 'Already processed' });
            }

            booking = tokenData.bookings;

            // Mark Token Used
            await supabase.from('payment_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenData.id);
        } else {
            // --- DIRECT WEBSITE CHECKOUT FLOW (no token) ---
            // Check if booking already exists from webhook
            const bookingIdFromMeta = session.metadata?.bookingId;

            if (bookingIdFromMeta) {
                const { data: existingBooking } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', bookingIdFromMeta)
                    .single();
                booking = existingBooking;
            }

            // If no booking yet (webhook didn't run or failed), create it from metadata
            if (!booking) {
                console.log('[VerifySession] Booking not found, creating from Stripe metadata...');
                const meta = session.metadata || {};
                const amountPaid = (session.amount_total || 0) / 100;
                const isDeposit = Math.abs(amountPaid - Number(meta.depositAmount)) < 1;

                const { data: newBooking, error: createError } = await supabase
                    .from('bookings')
                    .insert({
                        id: crypto.randomUUID(),
                        houseboat_id: meta.boatId,
                        start_time: meta.startTime,
                        end_time: meta.endTime,
                        client_name: meta.clientName || session.customer_details?.name || 'Guest',
                        client_email: meta.clientEmail || session.customer_details?.email,
                        client_phone: meta.clientPhone || '',
                        status: 'Confirmed',
                        payment_status: isDeposit ? 'deposit_paid' : 'fully_paid',
                        amount_paid: amountPaid,
                        total_price: Number(meta.totalPrice),
                        number_of_guests: Number(meta.numberOfGuests) || 2,
                        billing_nif: meta.billingNif || null,
                        billing_address: meta.billingAddress || null,
                        billing_name: meta.clientName || null,
                        source: 'website'
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('[VerifySession] Failed to create booking:', createError);
                    return NextResponse.json({ error: 'Failed to create booking', details: createError.message }, { status: 500 });
                }

                booking = newBooking;
                console.log(`[VerifySession] Created booking: ${booking.id}`);
            }
        }

        // Amount paid in this session (Stripe total is in cents)
        const paidAmount = (session.amount_total || 0) / 100;

        // 3. Update Booking
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                amount_paid: (booking.amount_paid || 0) + paidAmount,
                payment_status: 'fully_paid',
                status: 'Confirmed',
                // Billing info was already updated in create-checkout-session
            })
            .eq('id', booking.id);

        if (updateError) throw updateError;

        // Note: Token marking is already handled inside the if(token) block above

        // 5. Send Emails
        // Client Receipt
        const receiptSubject = `Payment Receipt - ${booking.client_name}`;
        const receiptBody = `
Dear ${booking.client_name},

We have received your payment of €${paidAmount.toFixed(2)}.

Your reservation is now CONFIRMED.

Billing Details (if provided):
Name: ${booking.billing_name || booking.client_name}
NIF: ${booking.billing_nif || 'Not provided'}
Address: ${booking.billing_address || 'Not provided'}

Thank you for choosing Amieira Getaways.
        `;
        // Send with timeout safety
        const timeout = new Promise<void>((_, r) => setTimeout(() => r(new Error('Email timeout')), 4000));
        await Promise.race([sendEmail(booking.client_email, receiptSubject, receiptBody), timeout]).catch(e => console.error('Receipt email failed:', e));

        // Finance Notification
        const financeEmail = process.env.FINANCE_EMAIL || 'finance@amieiramarina.com';
        const invoiceSubject = `[URGENT] Issue Invoice - Booking ${booking.id.slice(0, 8)}`;
        const invoiceBody = `
To Finance Department,

A payment has been received via Stripe Checkout. Please issue the invoice/fatura.

Client: ${booking.billing_name || booking.client_name}
NIF: ${booking.billing_nif || 'N/A'}
Address: ${booking.billing_address || 'N/A'}

Amount: €${paidAmount.toFixed(2)}
Booking Date: ${new Date(booking.start_time).toLocaleDateString()}
Service: ${booking.houseboat_id ? 'Houseboat' : 'Restaurant'}

Booking ID: ${booking.id}
Stripe Session: ${sessionId}
        `;
        await Promise.race([sendEmail(financeEmail, invoiceSubject, invoiceBody), timeout]).catch(e => console.error('Finance email failed:', e));

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Verify Payment Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
