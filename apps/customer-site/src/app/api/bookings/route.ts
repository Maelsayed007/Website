import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET - Fetch all bookings
export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ bookings: data });
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

        const supabase = createAdminClient();
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

        const supabase = createAdminClient();
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
