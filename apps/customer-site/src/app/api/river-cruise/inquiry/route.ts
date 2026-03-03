import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRiverCruiseEligibility, RIVER_CRUISE_MIN_PAYABLE_GUESTS } from '@/lib/booking-rules';
import { sendBookingRequestEmail, sendEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const {
            packageId,
            date,
            time,
            adults = 0,
            children = 0,
            seniors = 0,
            clientName,
            clientEmail,
            clientPhone,
            withFood = false,
            menuSelections = [],
            notes = '',
        } = body;

        const totalGuests = Number(adults || 0) + Number(children || 0) + Number(seniors || 0);
        if (!packageId || !date || !time || totalGuests <= 0 || !clientName || !clientEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: packageId, date, time, guests, clientName, clientEmail' },
                { status: 400 }
            );
        }

        const eligibility = getRiverCruiseEligibility(totalGuests, RIVER_CRUISE_MIN_PAYABLE_GUESTS);
        if (eligibility.eligibleForCheckout) {
            return NextResponse.json(
                { error: 'This group size can use direct booking checkout.', eligibility },
                { status: 400 }
            );
        }

        const { data: pkg, error: pkgError } = await supabase
            .from('daily_travel_packages')
            .select('id, name, duration_hours')
            .eq('id', packageId)
            .single();

        if (pkgError || !pkg) {
            return NextResponse.json({ error: 'Package not found.' }, { status: 404 });
        }

        const slotStart = new Date(`${date}T${time}:00.000Z`);
        const slotEnd = new Date(slotStart.getTime() + (Number(pkg.duration_hours || 2) * 60 * 60 * 1000));
        const bookingNotes = [
            `River cruise inquiry (<${RIVER_CRUISE_MIN_PAYABLE_GUESTS} guests).`,
            `Breakdown: ${adults} Adults, ${children} Children, ${seniors} Seniors.`,
            `With food: ${withFood ? 'Yes' : 'No'}.`,
            menuSelections.length > 0
                ? `Menus: ${menuSelections.map((m: any) => `${m.quantity || 1}x ${m.menuId}`).join(', ')}`
                : 'Menus: none.',
            notes ? `Client notes: ${notes}` : '',
        ].filter(Boolean).join('\n');

        const { data: inquiryBooking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                daily_travel_package_id: packageId,
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone || null,
                start_time: slotStart.toISOString(),
                end_time: slotEnd.toISOString(),
                status: 'Pending',
                payment_status: 'unpaid',
                number_of_guests: totalGuests,
                adults: adults,
                children: children,
                seniors: seniors,
                with_food: withFood,
                source: 'Website - River Cruise Inquiry',
                notes: bookingNotes,
            })
            .select('id, start_time, end_time')
            .single();

        if (bookingError || !inquiryBooking) {
            return NextResponse.json({ error: 'Failed to create inquiry.' }, { status: 500 });
        }

        const { data: existingClients } = await supabase
            .from('clients')
            .select('id')
            .eq('email', clientEmail.toLowerCase())
            .limit(1);

        const now = new Date().toISOString();
        if (!existingClients || existingClients.length === 0) {
            await supabase.from('clients').insert({
                name: clientName,
                email: clientEmail.toLowerCase(),
                phone: clientPhone || null,
                status: 'Lead',
                last_contact: now,
                created_at: now,
                contact_history: [],
            });
        } else {
            await supabase
                .from('clients')
                .update({ last_contact: now, phone: clientPhone || undefined })
                .eq('id', existingClients[0].id);
        }

        await sendBookingRequestEmail({
            id: inquiryBooking.id,
            clientName,
            clientEmail,
            startTime: inquiryBooking.start_time,
            endTime: inquiryBooking.end_time,
            status: 'Pending',
            riverCruisePackageId: packageId,
            numberOfGuests: totalGuests,
        });

        await sendEmail(
            process.env.STAFF_EMAIL || 'geralamieira@gmail.com',
            `River Cruise Inquiry (${totalGuests} guests) - ${pkg.name}`,
            `<p>New inquiry received for <strong>${pkg.name}</strong>.</p>
             <p><strong>Client:</strong> ${clientName} (${clientEmail})</p>
             <p><strong>Guests:</strong> ${totalGuests}</p>
             <p><strong>Date:</strong> ${date} ${time}</p>
             <p><strong>Notes:</strong><br/>${bookingNotes.replace(/\n/g, '<br/>')}</p>`
        );

        return NextResponse.json({
            success: true,
            inquiryId: inquiryBooking.id,
            eligibility,
            message: `Inquiry submitted. Our team will contact you and send a 30% payment link if approved.`,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
