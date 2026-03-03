import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const {
            bookingId,
            totalPrice,
            packageName,
            clientName,
            clientEmail,
            clientPhone,
            clientNif,
            clientAddress,
            date,
            adults,
            children,
            seniors,
            offerId,
            offerTitle,
        } = body;

        if (!bookingId || !totalPrice || !clientEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: bookingId, totalPrice, clientEmail' },
                { status: 400 }
            );
        }

        // All services use 30% deposit to confirm.
        const deposit = Math.round(Number(totalPrice) * 0.3 * 100) / 100;
        const unitAmount = Math.round(deposit * 100);

        const formattedDate = date || 'TBD';
        const guestBreakdown = `${adults || 0} Adults, ${children || 0} Children, ${seniors || 0} Seniors`;
        const description = `Deposit (30%) • ${packageName} • ${formattedDate} • ${guestBreakdown}`;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            automatic_payment_methods: { enabled: true },
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Day Cruise: ${packageName}`,
                            description,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/river-cruise?canceled=true`,
            metadata: {
                bookingId,
                totalPrice: String(totalPrice),
                depositAmount: String(deposit),
                paymentOption: 'deposit',
                clientName,
                clientEmail,
                clientPhone: clientPhone || '',
                clientNif: clientNif || '',
                clientAddress: clientAddress || '',
                offerId: offerId || '',
                offerTitle: offerTitle || '',
            },
            customer_email: clientEmail,
        } as any);

        await supabase.from('bookings').update({
            total_price: totalPrice,
            payment_status: 'unpaid',
        }).eq('id', bookingId);

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
