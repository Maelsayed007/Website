import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPermission, validateSession } from '@/lib/admin-auth';

async function requirePermission(permission: 'canViewBookings' | 'canEditBookings' | 'canDeleteBookings') {
    const user = await validateSession();
    if (!user || !hasPermission(user, permission)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return null;
}

type BookingOverlapRow = {
    id: string;
    status: string | null;
    client_name: string | null;
    start_time: string;
    end_time: string;
};

function normalizeStatus(value: unknown) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseIsoDate(value: unknown) {
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

async function findOverlappingBooking(params: {
    supabase: ReturnType<typeof createAdminClient>;
    houseboatId: string;
    startTime: string;
    endTime: string;
    excludeBookingId?: string;
}) {
    const { supabase, houseboatId, startTime, endTime, excludeBookingId } = params;
    let query = supabase
        .from('bookings')
        .select('id,status,client_name,start_time,end_time')
        .eq('houseboat_id', houseboatId)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .order('start_time', { ascending: true })
        .limit(20);

    if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as BookingOverlapRow[]).find(
        (booking) => normalizeStatus(booking.status) !== 'cancelled'
    ) || null;
}

function overlapError(overlap: BookingOverlapRow) {
    const ref = overlap.id.slice(0, 8).toUpperCase();
    return NextResponse.json(
        { error: `This boat already has a reservation in that period (Ref ${ref}).` },
        { status: 409 }
    );
}

// GET - Fetch all bookings
export async function GET() {
    try {
        const unauthorized = await requirePermission('canViewBookings');
        if (unauthorized) return unauthorized;

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) throw error;

        return NextResponse.json(
            { bookings: data },
            { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
        );
    } catch (error: any) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch bookings' },
            { status: 500 }
        );
    }
}

// POST - Create new booking
export async function POST(request: Request) {
    try {
        const unauthorized = await requirePermission('canEditBookings');
        if (unauthorized) return unauthorized;

        const body = await request.json();
        console.log('POST /api/bookings - Body:', JSON.stringify(body, null, 2));
        const {
            houseboatId,
            clientName,
            clientEmail,
            clientPhone,
            numberOfGuests,
            startTime,
            endTime,
            status,
            source,
            notes,
            price,
            selectedExtras,
            discount
        } = body;

        if (!houseboatId || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Boat, start time and end time are required.' },
                { status: 400 }
            );
        }

        const startDate = parseIsoDate(startTime);
        const endDate = parseIsoDate(endTime);
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Invalid reservation date format.' },
                { status: 400 }
            );
        }
        if (endDate <= startDate) {
            return NextResponse.json(
                { error: 'End date must be later than start date.' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        if (normalizeStatus(status || 'Pending') !== 'cancelled') {
            const overlap = await findOverlappingBooking({
                supabase,
                houseboatId,
                startTime,
                endTime,
            });
            if (overlap) {
                return overlapError(overlap);
            }
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                id: crypto.randomUUID(),
                houseboat_id: houseboatId,
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone,
                number_of_guests: numberOfGuests,
                start_time: startTime,
                end_time: endTime,
                status: status || 'Pending',
                source: source || 'manual',
                notes: notes || '',
                total_price: price || 0, // Map price to total_price
                selected_extras: selectedExtras || [],
                discount: discount || 0
            })
            .select()
            .single();

        if (error) {
            console.error('Database error in POST /api/bookings:', error);
            throw error;
        }

        return NextResponse.json({ booking: data });
    } catch (error: any) {
        console.error('Error creating booking:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create booking' },
            { status: 500 }
        );
    }
}

// PUT - Update existing booking
export async function PUT(request: Request) {
    try {
        const unauthorized = await requirePermission('canEditBookings');
        if (unauthorized) return unauthorized;

        const body = await request.json();
        console.log('PUT /api/bookings - Body:', JSON.stringify(body, null, 2));
        const {
            id,
            houseboatId,
            clientName,
            clientEmail,
            clientPhone,
            numberOfGuests,
            startTime,
            endTime,
            status,
            source,
            notes,
            price,
            selectedExtras,
            discount
        } = body;

        if (!id) {
            console.error('PUT /api/bookings - Missing ID');
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        if (!houseboatId || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Boat, start time and end time are required.' },
                { status: 400 }
            );
        }

        const startDate = parseIsoDate(startTime);
        const endDate = parseIsoDate(endTime);
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Invalid reservation date format.' },
                { status: 400 }
            );
        }
        if (endDate <= startDate) {
            return NextResponse.json(
                { error: 'End date must be later than start date.' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        if (normalizeStatus(status) !== 'cancelled') {
            const overlap = await findOverlappingBooking({
                supabase,
                houseboatId,
                startTime,
                endTime,
                excludeBookingId: id,
            });
            if (overlap) {
                return overlapError(overlap);
            }
        }

        const { data, error } = await supabase
            .from('bookings')
            .update({
                houseboat_id: houseboatId,
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone,
                number_of_guests: numberOfGuests,
                start_time: startTime,
                end_time: endTime,
                status,
                source,
                notes,
                total_price: price, // Map price to total_price
                selected_extras: selectedExtras || [],
                discount: discount || 0
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Database error in PUT /api/bookings:', error);
            throw error;
        }

        return NextResponse.json({ booking: data });
    } catch (error: any) {
        console.error('Error updating booking:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update booking' },
            { status: 500 }
        );
    }
}

// DELETE - Cancel/delete booking
export async function DELETE(request: Request) {
    try {
        const unauthorized = await requirePermission('canDeleteBookings');
        if (unauthorized) return unauthorized;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting booking:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete booking' },
            { status: 500 }
        );
    }
}
