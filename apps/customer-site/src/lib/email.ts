
'use server';

import { Resend } from 'resend';

const fromEmail = 'Amieira Getaways <onboarding@resend.dev>';

type BookingData = {
    id?: string;
    clientName: string;
    clientEmail: string;
    startTime: string | Date;
    endTime?: string | Date;
    status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Maintenance';
    price?: number;
    houseboatId?: string;
    restaurantTableId?: string;
    dailyTravelPackageId?: string;
    numberOfGuests?: number;
};

/**
 * A server-only function to handle the actual email sending.
 * It initializes the Resend client only when called on the server.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    'use server';

    console.log(`[Email] Attempting to send email to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);

    // Check for API key and initialize Resend client here.
    if (!process.env.RESEND_API_KEY) {
        console.log('[Email] ⚠️ No RESEND_API_KEY found. Logging to console instead.');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Body:', body);
        console.log('[Email] --- END MOCK EMAIL ---');
        return false;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("[Email] Sending timed out (5s)")), 5000)
        );

        const result = await Promise.race([
            resend.emails.send({
                from: fromEmail,
                to: to,
                subject: subject,
                text: body,
            }),
            timeout
        ]);

        console.log('[Email] ✅ Email sent successfully:', result);
        return true;
    } catch (error: any) {
        console.error('[Email] ❌ Failed to send email:', error?.message || error);
        // Don't throw - return false so calling code can continue
        return false;
    }
}


function getBookingType(booking: BookingData) {
    if (booking.houseboatId) return 'Houseboat Reservation';
    if (booking.restaurantTableId) return 'Restaurant Reservation';
    if (booking.dailyTravelPackageId) return 'Daily Travel Excursion';
    return 'General Inquiry';
}

/**
 * Sends an email to the customer after they submit a booking request.
 * This function can be called from client or server components.
 * @param booking - The booking data.
 */
export async function sendBookingRequestEmail(booking: BookingData) {
    const subject = `Booking Request Received for ${getBookingType(booking)}`;
    const body = `
Dear ${booking.clientName},

Thank you for your booking request! We have received it and will be reviewing it shortly.

**Request Details:**
- Service: ${getBookingType(booking)}
- Date: ${new Date(booking.startTime).toLocaleDateString()}
- Status: ${booking.status}

We will notify you via email once your booking has been confirmed.

Best regards,
The Amieira Getaways Team
    `;

    await sendEmail(booking.clientEmail, subject, body);
}


/**
 * Sends an email to the customer when their booking status changes.
 * This function can be called from client or server components.
 * @param booking - The booking data.
 * @param newStatus - The new status of the booking.
 */
export async function sendBookingStatusUpdateEmail(booking: BookingData, newStatus: 'Confirmed' | 'Cancelled') {
    let subject = '';
    let body = '';

    if (newStatus === 'Confirmed') {
        subject = `Your Booking is Confirmed! - ${getBookingType(booking)}`;
        body = `
Dear ${booking.clientName},

Great news! Your booking has been confirmed.

**Booking Details:**
- Service: ${getBookingType(booking)}
- Date: ${new Date(booking.startTime).toLocaleDateString()}
- Status: Confirmed

We look forward to welcoming you! Please don't hesitate to contact us if you have any questions.

Best regards,
The Amieira Getaways Team
        `;
    } else if (newStatus === 'Cancelled') {
        subject = `Booking Cancellation Notice - ${getBookingType(booking)}`;
        body = `
Dear ${booking.clientName},

This is a notification that your booking has been cancelled.

**Booking Details:**
- Service: ${getBookingType(booking)}
- Date: ${new Date(booking.startTime).toLocaleDateString()}
- Status: Cancelled

If you believe this was in error or have any questions, please contact us immediately.

Best regards,
The Amieira Getaways Team
        `;
    }

    if (subject) {
        await sendEmail(booking.clientEmail, subject, body);
    }
}

/**
 * Sends a payment link email to the client.
 */
export async function sendPaymentLinkEmail(email: string, clientName: string, paymentLink: string, bookingType: string, amount: number) {
    const subject = `Payment Request for ${bookingType} - Amieira Getaways`;
    const body = `
Dear ${clientName},

A payment link has been generated for your reservation.

**Payment Details:**
- Service: ${bookingType}
- Amount Due: €${amount.toFixed(2)}

Please click the link below to complete your payment securely:
${paymentLink}

This link is valid for 48 hours.

If you have any questions, simply reply to this email.

Best regards,
The Amieira Getaways Team
    `;

    await sendEmail(email, subject, body);
}
