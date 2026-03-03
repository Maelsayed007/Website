
'use server';

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const fromEmail = 'Amieira Getaways <onboarding@resend.dev>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

async function getLogoUrl(): Promise<string> {
    try {
        const supabase = createAdminClient();
        const { data } = await supabase.from('site_settings').select('data').eq('key', 'main').single();
        let url = data?.data?.logoUrl;

        // Default if not set
        if (!url) return `${SITE_URL}/amieira-logo.png`;

        // If relative URL (e.g. /storage/...), prepend SITE_URL
        if (url.startsWith('/')) {
            url = `${SITE_URL}${url}`;
        }

        // If running mostly locally and the URL is local, email clients can't see it.
        // We use a fallback placeholder ONLY if it's localhost.
        if (url.includes('localhost')) {
            return 'https://images.unsplash.com/photo-1567861911437-538298e4232c?q=80&w=200&auto=format&fit=crop';
        }

        return url;
    } catch (e) {
        console.error('Failed to fetch logo settings', e);
        return `${SITE_URL}/amieira-logo.png`;
    }
}

// Brand Colors
const COLORS = {
    primary: '#34C759', // Green
    dark: '#18230F',    // Dark Text
    bg: '#F8FAFC',      // Light Background
    white: '#FFFFFF',
    text: '#475569',    // Slate 600
    border: '#E2E8F0'
};

/**
 * Generates a premium HTML email template
 */
function generateEmailHtml(title: string, content: string, logoUrl: string, action?: { text: string; url: string }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: ${COLORS.white}; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: ${COLORS.white}; padding: 32px; text-align: center; border-bottom: 1px solid ${COLORS.border}; }
        .logo { height: 40px; width: auto; object-fit: contain; }
        .content { padding: 40px 32px; color: ${COLORS.dark}; line-height: 1.6; font-size: 16px; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { background-color: ${COLORS.primary}; color: ${COLORS.dark}; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(52, 199, 89, 0.2); }
        .footer { background-color: ${COLORS.bg}; padding: 32px; text-align: center; color: ${COLORS.text}; font-size: 12px; }
        h1 { margin: 0 0 24px; font-size: 24px; color: ${COLORS.dark}; font-weight: 700; letter-spacing: -0.025em; }
        p { margin: 0 0 16px; color: ${COLORS.text}; }
        .details-box { background-color: ${COLORS.bg}; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid ${COLORS.border}; }
        strong { color: ${COLORS.dark}; }
    </style>
</head>
<body>
    <div style="background-color: ${COLORS.bg}; padding: 20px;">
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="Amieira Marina" class="logo">
                <!-- Fallback text if logo doesn't load in localhost -->
                <div style="font-size: 10px; color: #cbd5e1; margin-top: 8px;">AMIEIRA MARINA</div>
            </div>
            <div class="content">
                <h1>${title}</h1>
                ${content}
                
                ${action ? `
                <div class="button-container">
                    <a href="${action.url}" class="button">${action.text}</a>
                </div>
                ` : ''}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Amieira Marina. All rights reserved.</p>
                <p>Grande Lago, Alqueva, Portugal</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

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
    riverCruisePackageId?: string;
    numberOfGuests?: number;
};

/**
 * A server-only function to handle the actual email sending.
 * It initializes the Resend client only when called on the server.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {

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
                html: body, // Changed from text to html
                text: body.replace(/<[^>]*>?/gm, ''), // Stripped text version
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
    if (booking.riverCruisePackageId) return 'River Cruise Excursion';
    return 'General Inquiry';
}

/**
 * Sends an email to the customer after they submit a booking request.
 * This function can be called from client or server components.
 * @param booking - The booking data.
 */
export async function sendBookingRequestEmail(booking: BookingData) {
    const subject = `Booking Request Received for ${getBookingType(booking)}`;
    const content = `
        <p>Dear ${booking.clientName},</p>
        <p>Thank you for your booking request! We have received it and will be reviewing it shortly.</p>
        
        <div class="details-box">
            <p><strong>Service:</strong> ${getBookingType(booking)}</p>
            <p><strong>Date:</strong> ${new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Status:</strong> <span style="color: #ca8a04; font-weight: bold;">${booking.status}</span></p>
        </div>
        
        <p>We will notify you via email once your booking has been confirmed.</p>
    `;

    const logoUrl = await getLogoUrl();
    const html = generateEmailHtml(subject, content, logoUrl);
    await sendEmail(booking.clientEmail, subject, html);
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
        const content = `
            <p>Dear ${booking.clientName},</p>
            <p>Great news! Your booking has been confirmed.</p>
            
            <div class="details-box">
                <p><strong>Service:</strong> ${getBookingType(booking)}</p>
                <p><strong>Date:</strong> ${new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Status:</strong> <span style="color: ${COLORS.primary}; font-weight: bold;">Confirmed</span></p>
            </div>
            
            <p>We look forward to welcoming you! Please don't hesitate to contact us if you have any questions.</p>
        `;
        const logoUrl = await getLogoUrl();
        body = generateEmailHtml(subject, content, logoUrl);

    } else if (newStatus === 'Cancelled') {
        subject = `Booking Cancellation Notice - ${getBookingType(booking)}`;

        const content = `
            <p>Dear ${booking.clientName},</p>
            <p>This is a notification that your booking has been cancelled.</p>
            
            <div class="details-box">
                <p><strong>Service:</strong> ${getBookingType(booking)}</p>
                <p><strong>Date:</strong> ${new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Cancelled</span></p>
            </div>
            
            <p>If you believe this was in error or have any questions, please contact us immediately.</p>
        `;
        const logoUrl = await getLogoUrl();
        body = generateEmailHtml(subject, content, logoUrl);
    }

    if (subject) {
        await sendEmail(booking.clientEmail, subject, body);
    }
}

/**
 * Sends a premium accounting notification email
 */
export async function sendAccountingEmail(booking: any, amountPaid: number, totalPaid: number, totalPrice: number, session: any) {
    const isFullyPaid = totalPaid >= (totalPrice - 0.05);
    const paymentType = isFullyPaid ? 'FULL PAYMENT' : 'PARTIAL PAYMENT';
    const remainingBalance = Math.max(0, totalPrice - totalPaid);

    let paymentMethod = 'Card';
    if (session.payment_method_types?.includes('multibanco')) paymentMethod = 'Multibanco';
    else if (session.payment_method_types?.includes('mb_way')) paymentMethod = 'MB WAY';

    const subject = `[${paymentType}] Payment Received - Booking #${booking.id.slice(0, 8)} - €${amountPaid.toFixed(2)}`;

    const content = `
        <p>A ${paymentType.toLowerCase()} has been received for a reservation.</p>
        <div style="margin: 24px 0; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden;">
            <div style="background-color: ${COLORS.dark}; color: white; padding: 12px 20px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Details</div>
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: ${COLORS.text};">Amount Paid:</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">€${amountPaid.toFixed(2)}</td></tr>
                    <tr><td style="padding: 6px 0; color: ${COLORS.text};">Payment Method:</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${paymentMethod}</td></tr>
                    <tr><td style="padding: 6px 0; color: ${COLORS.text}; border-top: 1px solid ${COLORS.border};">Total Paid to Date:</td><td style="padding: 6px 0; font-weight: bold; text-align: right; border-top: 1px solid ${COLORS.border};">€${totalPaid.toFixed(2)}</td></tr>
                    <tr><td style="padding: 6px 0; color: ${COLORS.text};">Total Price:</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">€${totalPrice.toFixed(2)}</td></tr>
                    <tr><td style="padding: 6px 0; color: ${COLORS.text}; border-top: 1px dashed ${COLORS.border}; font-size: 16px;">Remaining Balance:</td><td style="padding: 6px 0; font-weight: bold; text-align: right; border-top: 1px dashed ${COLORS.border}; color: ${remainingBalance > 0 ? '#ef4444' : COLORS.primary}; font-size: 16px;">€${remainingBalance.toFixed(2)}</td></tr>
                </table>
            </div>
        </div>

        <div style="margin: 24px 0; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden;">
            <div style="background-color: ${COLORS.dark}; color: white; padding: 12px 20px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Invoice Data (Fatura)</div>
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: ${COLORS.text};">Client Name:</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.billing_name || booking.client_name || 'Not Provided'}</td></tr>
                    <tr><td style="padding: 6px 0; color: ${COLORS.text};">NIF (Tax ID):</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.billing_nif || 'Consumer Invoice (999999990)'}</td></tr>
                    <tr><td style="padding: 12px 0 6px; color: ${COLORS.text}; vertical-align: top;">Address:</td><td style="padding: 12px 0 6px; font-weight: bold; text-align: right; max-width: 200px;">${booking.billing_address || 'Not Provided'}</td></tr>
                </table>
            </div>
        </div>

        <div style="text-align: center; margin-top: 32px; padding: 20px; background-color: ${isFullyPaid ? COLORS.primary + '10' : '#FFF9EB'}; border-radius: 12px; border: 1px solid ${isFullyPaid ? COLORS.primary : '#FCD34D'};">
            <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: ${isFullyPaid ? '#166534' : '#92400E'};">
                ${isFullyPaid ? '✅ PLEASE GENERATE FINAL INVOICE' : '⏳ PARTIAL PAYMENT - AWAIT COMPLETION'}
            </div>
        </div>
    `;

    const logoUrl = await getLogoUrl();
    const html = generateEmailHtml(subject, content, logoUrl);
    await sendEmail(process.env.ACCOUNTING_EMAIL || 'geralamieira@gmail.com', subject, html);
}

/**
 * Sends a premium receipt email to the client
 */
export async function sendClientReceipt(booking: any, amountPaid: number) {
    const subject = `Payment Confirmation - €${amountPaid.toFixed(2)} - Amieira Marina`;
    const bookingIdLabel = booking.id ? booking.id.slice(0, 8).toUpperCase() : 'N/A';

    const content = `
        <p>Dear ${booking.billing_name || booking.client_name || 'Valued Guest'},</p>
        <p>This email confirms that we have successfully received your payment. Thank you for choosing Amieira Marina for your stay on the Grande Lago.</p>
        
        <div style="margin: 32px 0; border: 1px solid ${COLORS.border}; border-radius: 16px; overflow: hidden; background-color: ${COLORS.white};">
            <div style="background-color: ${COLORS.dark}; color: white; padding: 16px 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; font-weight: 800; uppercase; letter-spacing: 0.1em; opacity: 0.8;">Payment Receipt</span>
                    <span style="font-size: 11px; font-weight: 800; uppercase; letter-spacing: 0.1em; opacity: 0.8;">Ref: #${bookingIdLabel}</span>
                </div>
            </div>
            <div style="padding: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid ${COLORS.bg};">
                            <div style="font-size: 11px; font-weight: 800; color: ${COLORS.text}; text-transform: uppercase;">Amount Paid</div>
                            <div style="font-size: 24px; font-weight: 800; color: ${COLORS.primary};">€${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid ${COLORS.bg};">
                            <div style="font-size: 11px; font-weight: 800; color: ${COLORS.text}; text-transform: uppercase;">Service Details</div>
                            <div style="font-size: 14px; font-weight: 700; color: ${COLORS.dark}; margin-top: 4px;">
                                ${booking.houseboat_id ? 'Houseboat Stay' : 'Restaurant Reservation'}
                            </div>
                            <div style="font-size: 13px; color: ${COLORS.text};">
                                Check-in: ${new Date(booking.start_time || booking.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </td>
                    </tr>
                    ${booking.billing_nif ? `
                    <tr>
                        <td style="padding: 12px 0;">
                            <div style="font-size: 11px; font-weight: 800; color: ${COLORS.text}; text-transform: uppercase;">Billing Information</div>
                            <div style="font-size: 13px; font-weight: 700; color: ${COLORS.dark}; margin-top: 4px;">NIF: ${booking.billing_nif}</div>
                            <div style="font-size: 13px; color: ${COLORS.text};">${booking.billing_name || ''}</div>
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </div>
        </div>
        
        <p style="font-size: 14px; color: ${COLORS.text};">
            If you have requested an invoice with your Tax ID (NIF), our accounting department will process it and send the official document to you shortly.
        </p>
        
        <p style="font-size: 14px; color: ${COLORS.text}; font-weight: 600; margin-top: 32px;">
            We look forward to welcoming you soon!<br>
            The Amieira Marina team
        </p>
    `;

    const logoUrl = await getLogoUrl();
    const html = generateEmailHtml('Payment Confirmation', content, logoUrl);
    await sendEmail(booking.client_email || booking.clientEmail, subject, html);
}

/**
 * Sends a staff alert for failed or expired payments
 */
export async function sendStaffPaymentFailedEmail(booking: any, session: any) {
    const subject = `[ACTION REQUIRED] Payment Failed - Booking #${booking.id.slice(0, 8)}`;
    const amount = ((session.amount_total || 0) / 100).toFixed(2);

    const content = `
        <p style="color: #ef4444; font-weight: bold;">Attention Staff:</p>
        <p>A payment attempt has <strong>FAILED</strong> or <strong>EXPIRED</strong>.</p>
        
        <div style="background-color: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p><strong>Client:</strong> ${booking.client_name || 'Unknown'}</p>
            <p><strong>Amount Attempted:</strong> €${amount}</p>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Stripe Session:</strong> <code style="font-size: 11px;">${session.id}</code></p>
        </div>
        
        <p>Please follow up with the client to verify their payment method or generate a new payment link if necessary.</p>
    `;

    const logoUrl = await getLogoUrl();
    const html = generateEmailHtml('Payment Unsuccessful', content, logoUrl, {
        text: 'View Payments Dashboard',
        url: `${SITE_URL}/dashboard/payments`
    });
    await sendEmail(process.env.STAFF_EMAIL || 'geralamieira@gmail.com', subject, html);
}

/**
 * Sends an email to the client with a payment link
 */
export async function sendSecurePaymentLinkEmail(to: string, clientName: string, link: string, bookingType: string, amount: number) {
    const subject = `Complete your booking payment - ${bookingType}`;

    const content = `
        <p>Dear ${clientName},</p>
        <p>To finalize your ${bookingType.toLowerCase()}, please complete the payment using the secure link below.</p>
        
        <div class="details-box">
            <p><strong>Service:</strong> ${bookingType}</p>
            <p><strong>Amount to Pay:</strong> €${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        
        <p>This payment link is secure and valid for 48 hours. If you have any questions, please contact our team.</p>
    `;

    const logoUrl = await getLogoUrl();
    const html = generateEmailHtml('Secure Payment Link', content, logoUrl, {
        text: 'Pay Securely Now',
        url: link
    });

    await sendEmail(to, subject, html);
}

