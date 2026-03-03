import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { hasPermission, validateSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const user = await validateSession();
        if (!user || !hasPermission(user, 'canManagePayments')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const adminSupabase = createAdminClient(); // For writing bypassing RLS

        const {
            transactionId,
            invoiceStatus,
            invoiceRef,
            accountantNotes,
            bookingId,
            amount,
            method,
            reference,
            createdAt,
            billingName,
            billingNif,
            billingAddress
        } = await request.json();

        console.log(`[InvoiceAPI] Request for ${transactionId} (Booking: ${bookingId}, Amount: ${amount}) -> ${invoiceStatus}`);

        if (!transactionId) {
            return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
        }

        // Try to update existing record first (using admin client to ensure it works)
        const { data: updatedData, error: updateError } = await adminSupabase
            .from('payment_transactions')
            .update({
                invoice_status: invoiceStatus,
                invoice_ref: invoiceRef,
                accountant_notes: accountantNotes,
                ...(invoiceStatus === 'issued' ? { needs_invoice: true } : {})
            })
            .eq('id', transactionId)
            .select();

        // If not found (count 0 or starts with legacy-), we need to create/migrate it
        if ((!updateError && (!updatedData || updatedData.length === 0)) || transactionId.startsWith('legacy-')) {
            console.log(`[InvoiceAPI] Record ${transactionId} not found or legacy, searching for existing migration...`);

            if (!bookingId || !amount) {
                console.error('[InvoiceAPI] Missing migration data:', { bookingId, amount });
                return NextResponse.json({ error: 'Insufficient data to migrate record' }, { status: 400 });
            }

            const isGeneric = !reference ||
                reference.includes('Recorded before transaction logging') ||
                reference.includes('Migrated from legacy source');

            let query = adminSupabase
                .from('payment_transactions')
                .select('id')
                .eq('booking_id', bookingId)
                .eq('amount', amount);

            if (!isGeneric) {
                query = query.eq('reference', reference);
            }

            const { data: existing, error: findError } = await query.maybeSingle();

            if (findError) console.error('[InvoiceAPI] Find existing error:', findError);

            if (existing) {
                console.log(`[InvoiceAPI] Found existing record ${existing.id}, updating...`);
                const { error: finalUpdateError } = await adminSupabase
                    .from('payment_transactions')
                    .update({
                        invoice_status: invoiceStatus,
                        invoice_ref: invoiceRef,
                        accountant_notes: accountantNotes,
                        needs_invoice: true
                    })
                    .eq('id', existing.id);

                if (finalUpdateError) {
                    console.error('[InvoiceAPI] Final update error:', finalUpdateError);
                    return NextResponse.json({ error: finalUpdateError.message }, { status: 500 });
                }
            } else {
                console.log(`[InvoiceAPI] Creating NEW record for booking ${bookingId}`);
                const { error: insertError } = await adminSupabase
                    .from('payment_transactions')
                    .insert({
                        booking_id: bookingId,
                        amount: amount,
                        method: method || 'Legacy',
                        reference: reference || 'Migrated from legacy source',
                        type: 'payment',
                        status: 'completed',
                        created_at: createdAt || new Date().toISOString(),
                        billing_name: billingName,
                        billing_nif: billingNif,
                        billing_address: billingAddress,
                        invoice_status: invoiceStatus,
                        invoice_ref: invoiceRef,
                        accountant_notes: accountantNotes,
                        needs_invoice: true
                    });

                if (insertError) {
                    console.error('[InvoiceAPI] Insertion error:', insertError);
                    return NextResponse.json({ error: insertError.message }, { status: 500 });
                }
            }
        } else if (updateError) {
            console.error('[InvoiceAPI] Initial update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Invoice Status Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
