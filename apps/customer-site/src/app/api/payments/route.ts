import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPermission, validateSession } from '@/lib/admin-auth';

async function requirePaymentsPermission() {
    const user = await validateSession();
    if (!user || !hasPermission(user, 'canManagePayments')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return null;
}

async function updateBookingTotals(supabase: any, bookingId: string) {
    // Fetch all successful payments for this booking
    // Note: We sum from both 'payments' and 'payment_transactions'? 
    // Actually, 'payments' is the legacy/core table, 'payment_transactions' is the new logging.
    // Let's use 'payments' as the source of truth for total paid since it's cleaner.
    const { data: transactions, error: fetchError } = await supabase
        .from('payments')
        .select('amount')
        .eq('booking_id', bookingId)
        .eq('status', 'succeeded');

    if (fetchError) throw fetchError;

    const totalPaid = transactions?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;

    // Fetch booking to get total price
    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('price, total_price, status, source')
        .eq('id', bookingId)
        .single();

    if (bookingError) throw bookingError;

    const totalPrice = booking.total_price || booking.price || 0;

    let paymentStatus = 'unpaid';
    let newStatus = booking.status;

    if (totalPrice > 0) {
        if (totalPaid >= totalPrice - 0.05) { // 100% (with tolerance)
            paymentStatus = 'fully_paid';
            if (booking.source !== 'external') { // Preserve external source logic
                newStatus = 'Confirmed';
            }
        } else if (totalPaid >= totalPrice * 0.3) { // 30% Deposit
            paymentStatus = 'deposit_paid';
            if (booking.source !== 'external') {
                newStatus = 'Confirmed';
            }
        }
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            amount_paid: totalPaid,
            payment_status: paymentStatus,
            status: newStatus
        })
        .eq('id', bookingId);

    if (updateError) throw updateError;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const unauthorized = await requirePaymentsPermission();
        if (unauthorized) return unauthorized;

        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');
        const supabase = createAdminClient();

        if (bookingId) {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const transformedData = data.map((tx: any) => ({
                ...tx,
                method: tx.method || tx.metadata?.method || 'other',
                ref: tx.ref || tx.metadata?.ref || ''
            }));

            return NextResponse.json(
                { transactions: transformedData },
                { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
            );
        } else {
            // Fetch all recent payments (for dashboard)
            const { data, error } = await supabase
                .from('payments')
                .select('*, bookings(client_name, client_email, billing_nif, billing_name, billing_address)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            const transformedData = data.map((tx: any) => ({
                ...tx,
                method: tx.metadata?.details || tx.method || 'Online',
                ref: tx.ref || tx.metadata?.ref || ''
            }));

            return NextResponse.json(
                { transactions: transformedData },
                { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
            );
        }
    } catch (error: any) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const unauthorized = await requirePaymentsPermission();
        if (unauthorized) return unauthorized;

        const body = await request.json();
        const { bookingId, amount, method, ref, date } = body;

        console.log(`[API] Creating payment for booking: ${bookingId}, amount: ${amount}`);

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('payments')
            .insert({
                booking_id: bookingId,
                stripe_payment_intent_id: ref || `manual-${Date.now()}`,
                amount: parseFloat(amount),
                status: 'succeeded',
                created_at: date || new Date().toISOString(),
                method: method || 'cash',
                reference: ref || ''
            })
            .select()
            .single();

        if (error) throw error;

        // ALSO: Record in payment_transactions for the new premium history board
        // Fetch billing info from booking
        const { data: bookingData } = await supabase
            .from('bookings')
            .select('billing_name, billing_nif, billing_address, client_name')
            .eq('id', bookingId)
            .single();

        let displayMethod = method || 'cash';
        if (displayMethod === 'cash') displayMethod = 'CASH';
        if (displayMethod === 'card') displayMethod = 'TPA / Card';
        if (displayMethod === 'transfer') displayMethod = 'Bank Transfer';

        await supabase.from('payment_transactions').insert({
            booking_id: bookingId,
            amount: parseFloat(amount),
            method: displayMethod,
            status: 'completed',
            reference: ref || `Manual: ${displayMethod}`,
            type: 'payment',
            billing_name: bookingData?.billing_name || bookingData?.client_name || null,
            billing_nif: bookingData?.billing_nif || null,
            billing_address: bookingData?.billing_address || null,
            needs_invoice: !!(bookingData?.billing_nif),
            invoice_status: !!(bookingData?.billing_nif) ? 'pending' : 'ignored'
        });

        // Update booking totals
        await updateBookingTotals(supabase, bookingId);

        return NextResponse.json({ transaction: data });
    } catch (error: any) {
        console.error('Error creating payment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const unauthorized = await requirePaymentsPermission();
        if (unauthorized) return unauthorized;

        const body = await request.json();
        const { id, amount, method, ref, date } = body;

        const supabase = createAdminClient();

        // Find the transaction first to get booking_id
        const { data: tx, error: findError } = await supabase
            .from('payments')
            .select('booking_id')
            .eq('id', id)
            .single();

        if (findError) throw findError;

        const { data, error } = await supabase
            .from('payments')
            .update({
                amount: parseFloat(amount),
                status: 'succeeded',
                created_at: date,
                method,
                reference: ref
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update booking totals
        await updateBookingTotals(supabase, tx.booking_id);

        return NextResponse.json({ transaction: data });
    } catch (error: any) {
        console.error('Error updating payment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const unauthorized = await requirePaymentsPermission();
        if (unauthorized) return unauthorized;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Find the transaction first to get booking_id
        const { data: tx, error: findError } = await supabase
            .from('payments')
            .select('booking_id')
            .eq('id', id)
            .single();

        if (findError) throw findError;

        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Update booking totals
        await updateBookingTotals(supabase, tx.booking_id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting payment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
