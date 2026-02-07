
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const { token, billingInfo, paymentMethod } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 1. Validate Token Again (Security)
        const { data: tokenData, error: tokenError } = await supabase
            .from('payment_tokens')
            .select('*, bookings(*)')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData || tokenData.used_at || new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        const booking = tokenData.bookings;
        const amountPaid = booking.amount_paid || 0;
        const totalPrice = booking.total_price || booking.price || 0;

        // Use requested_amount if specified in token, otherwise remaining balance
        let amountToPay = 0;
        if (tokenData.requested_amount) {
            amountToPay = tokenData.requested_amount;
        } else {
            amountToPay = Math.max(0, totalPrice - amountPaid);
        }

        if (amountToPay <= 0) {
            return NextResponse.json({ error: 'Already paid' }, { status: 400 });
        }

        // 2. Process Payment (Mock or Stripe)
        // Here we assume payment succeeded if we reached this step with valid data (frontend handles Stripe Elements confirmation ideally, passing PaymentIntent ID)
        // For this implementation, we simulate success.

        // 3. Update Booking
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                amount_paid: (amountPaid + amountToPay),
                payment_status: 'fully_paid', // Assuming full payment
                status: 'Confirmed', // Auto-confirm
                billing_nif: billingInfo?.nif || null,
                billing_name: billingInfo?.name || null,
                billing_address: billingInfo?.address || null,
            })
            .eq('id', booking.id);

        if (updateError) {
            throw new Error('Failed to update booking');
        }

        // 4. Record Transaction
        await supabase.from('restaurant_payments').insert({ // Using restaurant_payments for now, or generalize to 'payments'
            booking_id: booking.id,
            amount: amountToPay,
            method: paymentMethod || 'online',
            notes: `Online payment via Link. NIF: ${billingInfo?.nif || 'N/A'}`
        });

        // 5. Mark Token Used
        await supabase.from('payment_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenData.id);

        // 6. Send Emails
        // Client Receipt
        const receiptSubject = `Payment Receipt - ${booking.client_name}`;
        const receiptBody = `
Dear ${booking.client_name},

We have received your payment of €${amountToPay.toFixed(2)}.

Your reservation is now CONFIRMED.

Billing Details Provided:
Name: ${billingInfo?.name || booking.client_name}
NIF: ${billingInfo?.nif || 'Not provided'}
Address: ${billingInfo?.address || 'Not provided'}

Thank you for choosing Amieira Getaways.
    `;
        await sendEmail(booking.client_email, receiptSubject, receiptBody).catch(console.error);

        // Finance Invoice Request
        const financeEmail = process.env.FINANCE_EMAIL || 'finance@amieiramarina.com'; // configured env or fallback
        const invoiceSubject = `[URGENT] Issue Invoice - Booking ${booking.id.slice(0, 8)}`;
        const invoiceBody = `
To Finance Department,

A payment has been received via Online Link. Please issue the invoice/fatura.

Client: ${billingInfo?.name || booking.client_name}
NIF: ${billingInfo?.nif || 'N/A'}
Address: ${billingInfo?.address || 'N/A'}

Amount: €${amountToPay.toFixed(2)}
Booking Date: ${new Date(booking.start_time).toLocaleDateString()}
Service: ${booking.houseboat_id ? 'Houseboat' : 'Restaurant'}

Booking ID: ${booking.id}
Transaction ID: (Internal)
    `;
        await sendEmail(financeEmail, invoiceSubject, invoiceBody).catch(console.error);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Process Payment Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
