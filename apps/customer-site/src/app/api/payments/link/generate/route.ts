import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendSecurePaymentLinkEmail } from '@/lib/email';
import { hasPermission, validateSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const supabase = createAdminClient();
    const user = await validateSession();
    if (!user || !hasPermission(user, 'canManagePayments')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { bookingId, email, amount, skipEmail, description, dueDate } = await request.json();

        if (!bookingId) {
            return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
        }

        // 2. Fetch Booking Details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Calculate remaining amount
        const amountPaid = booking.amount_paid || 0;
        const totalPrice = booking.total_price || booking.price || 0;
        let finalAmount = Math.max(0, totalPrice - amountPaid);

        if (amount && !isNaN(amount) && amount > 0) {
            finalAmount = amount;
        }

        if (finalAmount <= 0) {
            return NextResponse.json({ error: 'Amount to pay must be greater than 0' }, { status: 400 });
        }

        // 3. Generate Token
        // expires_at = dueDate OR now + 48 hours
        let expiresAt = new Date();
        if (dueDate) {
            expiresAt = new Date(dueDate);
            // Ensure end of day if only date provided, or just use as is
            expiresAt.setHours(23, 59, 59, 999);
        } else {
            expiresAt.setHours(expiresAt.getHours() + 48);
        }

        // 4. Create Payment Token
        const { data: tokenData, error: tokenError } = await supabase
            .from('payment_tokens')
            .insert({
                booking_id: bookingId,
                expires_at: expiresAt.toISOString(),
                requested_amount: finalAmount,
                description: description || `Payment for Booking #${booking.id.slice(0, 8)}`
            })
            .select('token')
            .single();

        if (tokenError) {
            console.error('Token Creation Error:', tokenError);
            throw new Error('Failed to create payment token');
        }

        const token = tokenData.token;
        const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'}/payment/${token}`;

        // 4. Send Email
        const targetEmail = email || booking.client_email;
        const clientName = booking.client_name || 'Valued Guest';
        const bookingType = booking.houseboat_id ? 'Houseboat Stay' : (booking.restaurant_table_id ? 'Restaurant Reservation' : 'Reservation');

        let emailSent = false;
        if (!skipEmail) {
            try {
                await sendSecurePaymentLinkEmail(targetEmail, clientName, link, bookingType, finalAmount);
                // 5. Update booking to mark email sent
                await supabase.from('bookings').update({ email_sent: true }).eq('id', bookingId);
                emailSent = true;
                console.log(`[Generate] Payment link email sent to ${targetEmail}`);
            } catch (emailErr) {
                console.error(`[Generate] Failed to send email to ${targetEmail}:`, emailErr);
                // We don't fail the request, but we flag it
            }
        }

        return NextResponse.json({ success: true, link, expiresAt, emailSent });

    } catch (error) {
        console.error('Generate Link Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
