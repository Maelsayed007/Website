
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to');

    if (!to) {
        return NextResponse.json({ error: 'Missing "to" query parameter' }, { status: 400 });
    }

    try {
        console.log(`[Debug] Attempting to send test email to: ${to}`);
        console.log(`[Debug] API Key available: ${!!process.env.RESEND_API_KEY}`);
        if (process.env.RESEND_API_KEY) {
            console.log(`[Debug] API Key start: ${process.env.RESEND_API_KEY.substring(0, 5)}...`);
        }

        await sendEmail(
            to,
            'Test Email from Amieira Debugger',
            'If you are reading this, your email configuration is working correctly!'
        );

        return NextResponse.json({
            success: true,
            message: `Email sent to ${to}`,
            debug_info: {
                key_present: !!process.env.RESEND_API_KEY
            }
        });
    } catch (error: any) {
        console.error('[Debug] Email send failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
