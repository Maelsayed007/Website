
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = createAdminClient();
        const { token, billingInfo, email } = await request.json();

        // Email validation helper
        const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('Missing STRIPE_SECRET_KEY');
        }

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 1. Validate Token & Get Booking
        const { data: tokenData, error: tokenError } = await supabase
            .from('payment_tokens')
            .select('*, bookings(*)')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData || tokenData.used_at || new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const booking = tokenData.bookings;

        // 2. Determine Email to use
        const customerEmail = email || booking.client_email;

        if (!customerEmail || !isValidEmail(customerEmail)) {
            return NextResponse.json({ error: 'A valid email address is required for receipt.' }, { status: 400 });
        }

        // 3. Update Email in DB if changed/new
        if (customerEmail !== booking.client_email) {
            await supabase.from('bookings').update({ client_email: customerEmail }).eq('id', booking.id);
        }

        const amountPaid = booking.amount_paid || 0;
        const totalPrice = booking.total_price || booking.price || 0;
        const remaining = Math.max(0, totalPrice - amountPaid);

        let amountToPay = remaining;
        if (tokenData.requested_amount && tokenData.requested_amount > 0) {
            amountToPay = Math.min(tokenData.requested_amount, remaining); // Safety cap
        }

        if (amountToPay <= 0) {
            return NextResponse.json({ error: 'Booking is already fully paid' }, { status: 400 });
        }

        // 2. Save Billing Info Immediately (If provided)
        if (billingInfo) {
            await supabase.from('bookings').update({
                billing_nif: billingInfo.nif,
                billing_name: billingInfo.name,
                billing_address: billingInfo.address
            }).eq('id', booking.id);
        }

        // 3. Create Stripe Checkout Session
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: customerEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: booking.houseboat_id ? 'Houseboat Reservation' : 'Restaurant Reservation',
                            description: `Booking #${booking.id.slice(0, 8)} - ${booking.client_name}`,
                        },
                        unit_amount: Math.round(amountToPay * 100), // Cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                bookingId: booking.id,
                tokenId: tokenData.id,
                nif: billingInfo?.nif || 'N/A'
            },
            success_url: `${siteUrl}/payment/${token}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/payment/${token}?canceled=true`,
        } as any);

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
    }
}
