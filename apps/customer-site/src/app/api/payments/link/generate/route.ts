
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendPaymentLinkEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const supabase = createAdminClient(); // Use admin client for DB ops to bypass RLS need for regular user

    // 1. Auth Check (Admin/Staff only)
    // 1. Auth Check (Admin logic - cookie based)
    // We check for the custom admin session first, as this is the primary staff auth method
    let user = null;
    try {
        const { validateSession } = await import('@/lib/admin-auth');
        user = await validateSession();
    } catch (e) {
        console.warn('Admin auth check failed, falling back to Supabase auth check', e);
    }


    // Fallback if admin auth lib fails or returns null
    if (!user) {
        // If not custom admin, check standard supabase auth
        // We need a standard client for this check
        const standardSupabase = await createClient();
        const { data: { session } } = await standardSupabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Double check admin role? Assuming authenticated staff can generate links.

    try {
        const { bookingId, email, amount, skipEmail } = await request.json();

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
        // We insert into payment_tokens table.
        // expires_at = now + 48 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        let tokenData;
        let tokenError;

        // Try inserting with requested_amount first
        try {
            const res = await supabase
                .from('payment_tokens')
                .insert({
                    booking_id: bookingId,
                    expires_at: expiresAt.toISOString(),
                    requested_amount: finalAmount
                })
                .select('token')
                .single();
            tokenData = res.data;
            tokenError = res.error;
        } catch (e) {
            tokenError = e;
        }

        // If that failed (likely due to column missing), try legacy insert
        if (tokenError) {
            console.warn('Insert with requested_amount failed, trying legacy insert:', tokenError);
            const res = await supabase
                .from('payment_tokens')
                .insert({
                    booking_id: bookingId,
                    expires_at: expiresAt.toISOString()
                    // Create token without requested_amount
                })
                .select('token')
                .single();
            tokenData = res.data;
            tokenError = res.error;
        }

        if (tokenError || !tokenData) {
            console.error('Token create error final:', tokenError);
            return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
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
                await sendPaymentLinkEmail(targetEmail, clientName, link, bookingType, finalAmount);
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
