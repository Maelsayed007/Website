
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'skillifyofficial1@gmail.com';

export async function POST(request: Request) {
    try {
        const { token, email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Try to find booking details from token, even if expired
        let bookingId: string | undefined;
        let clientName: string | undefined;

        if (token) {
            const { data: tokenData } = await supabase
                .from('payment_tokens')
                .select('booking_id, bookings(client_name)')
                .eq('token', token)
                .single();

            if (tokenData) {
                bookingId = tokenData.booking_id;
                const booking = Array.isArray(tokenData.bookings)
                    ? tokenData.bookings[0]
                    : tokenData.bookings;
                clientName = booking?.client_name;
            }
        }

        // Send Email to Staff
        const subject = `[ACTION REQUIRED] New Payment Link Requested`;
        const body = `
A client has requested a new payment link.

Client Email: ${email}
Client Name: ${clientName || 'Unknown / Not linked to valid token'}
Booking ID: ${bookingId || 'Unknown'}
Old Token: ${token || 'N/A'}

Please generate a new link in the dashboard and send it to them.
        `.trim();

        await sendEmail(STAFF_EMAIL, subject, body);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Request Link Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
