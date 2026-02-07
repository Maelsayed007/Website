
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
    const supabase = createAdminClient();
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
        // 1. Fetch Token
        const { data: tokenData, error: tokenError } = await supabase
            .from('payment_tokens')
            .select('*, bookings(*)')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
        }

        // 2. Check Expiry and Usage
        if (new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token expired' }, { status: 410 });
        }
        if (tokenData.used_at) {
            return NextResponse.json({ error: 'Token already used' }, { status: 409 }); // Conflict/Gone
        }

        const booking = tokenData.bookings;

        // Calculate amount due logic
        const amountPaid = booking.amount_paid || 0;
        const totalPrice = booking.total_price || booking.price || 0;
        const remaining = Math.max(0, totalPrice - amountPaid);

        if (remaining <= 0.01) {
            return NextResponse.json({ error: 'This booking has already been fully paid.' }, { status: 409 });
        }

        // Use requested_amount if available (Logic for custom deposits), otherwise remaining balance
        let amountDue = remaining;
        if (tokenData.requested_amount && tokenData.requested_amount > 0) {
            // Ensure we don't ask for more than remaining (e.g. if they paid partially elsewhere)
            amountDue = Math.min(tokenData.requested_amount, remaining);
        }

        // Return safe data
        return NextResponse.json({
            valid: true,
            booking: {
                id: booking.id,
                clientName: booking.client_name,
                serviceType: booking.houseboat_id ? 'Houseboat Stay' : 'Reservation',
                startDate: booking.start_time,
                endDate: booking.end_time,
                amountDue: amountDue,
                currency: 'EUR'
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
