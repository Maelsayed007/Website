import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function updateBookingTotals(supabase: any, bookingId: string) {
    // Fetch all successful payments for this booking
    const { data: transactions, error: fetchError } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('booking_id', bookingId)
        .eq('status', 'paid');

    if (fetchError) throw fetchError;

    const totalPaid = transactions?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;

    // Fetch booking to get total price
    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('price')
        .eq('id', bookingId)
        .single();

    if (bookingError) throw bookingError;

    let paymentStatus = 'unpaid';
    if (totalPaid >= booking.price && booking.price > 0) {
        paymentStatus = 'fully_paid';
    } else if (totalPaid > 0) {
        paymentStatus = 'deposit_paid';
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            amount_paid: totalPaid,
            payment_status: paymentStatus,
            // Auto-confirm if any payment is received
            ...(totalPaid > 0 && { status: 'Confirmed' })
        })
        .eq('id', bookingId);

    if (updateError) throw updateError;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');

        console.log(`[API] Fetching payments for booking: ${bookingId}`);

        if (!bookingId) {
            return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map metadata fields for frontend compatibility
        const transformedData = data.map((tx: any) => ({
            ...tx,
            method: tx.method || tx.metadata?.method || 'other',
            ref: tx.ref || tx.metadata?.ref || ''
        }));

        return NextResponse.json({ transactions: transformedData });
    } catch (error: any) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bookingId, amount, method, ref, status, date } = body;

        console.log(`[API] Creating payment for booking: ${bookingId}, amount: ${amount}`);

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('payment_transactions')
            .insert({
                booking_id: bookingId,
                stripe_payment_id: ref || `manual-${Date.now()}`,
                amount: parseFloat(amount),
                status: status || 'paid',
                created_at: date || new Date().toISOString(),
                metadata: {
                    method: method || 'cash',
                    ref: ref || '',
                    source: 'manual'
                }
            })
            .select()
            .single();

        if (error) throw error;

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
        const body = await request.json();
        const { id, amount, method, ref, status, date } = body;

        const supabase = createAdminClient();

        // Find the transaction first to get booking_id
        const { data: tx, error: findError } = await supabase
            .from('payment_transactions')
            .select('booking_id')
            .eq('id', id)
            .single();

        if (findError) throw findError;

        const { data, error } = await supabase
            .from('payment_transactions')
            .update({
                amount: parseFloat(amount),
                status,
                created_at: date,
                metadata: {
                    method,
                    ref,
                    source: 'manual'
                }
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
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Find the transaction first to get booking_id
        const { data: tx, error: findError } = await supabase
            .from('payment_transactions')
            .select('booking_id')
            .eq('id', id)
            .single();

        if (findError) throw findError;

        const { error } = await supabase
            .from('payment_transactions')
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
