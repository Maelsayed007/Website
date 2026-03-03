import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUnifiedAvailability } from '@/lib/availability';
import { getRiverCruiseEligibility, RIVER_CRUISE_MIN_PAYABLE_GUESTS } from '@/lib/booking-rules';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const {
            packageId,
            date,       // ISO date string, e.g. "2026-03-15"
            time,       // HH:mm string, e.g. "10:00"
            adults = 0,
            children = 0,
            seniors = 0,
            clientName,
            clientEmail,
            clientPhone,
            clientNif,
            clientAddress,
            selectedAddons = [], // Array of { addonId, quantityAdult, quantityChild, quantitySenior }
            menuSelections = [], // Array of { menuId, quantity, notes? }
        } = body;

        const totalGuests = adults + children + seniors;

        if (!packageId || !date || !time || totalGuests <= 0 || !clientName || !clientEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: packageId, date, time, guests, clientName, clientEmail' },
                { status: 400 }
            );
        }

        const eligibility = getRiverCruiseEligibility(totalGuests, RIVER_CRUISE_MIN_PAYABLE_GUESTS);
        if (!eligibility.eligibleForCheckout) {
            return NextResponse.json(
                {
                    error: eligibility.reason,
                    requiresInquiry: true,
                    eligibility,
                },
                { status: 400 }
            );
        }

        // 1. Fetch the package
        const { data: pkg, error: pkgError } = await supabase
            .from('daily_travel_packages')
            .select('*, daily_boats(max_capacity)')
            .eq('id', packageId)
            .single();

        if (pkgError || !pkg) {
            return NextResponse.json({ error: 'Package not found.' }, { status: 404 });
        }

        const minCapacity = Math.max(
            RIVER_CRUISE_MIN_PAYABLE_GUESTS,
            pkg.min_capacity || pkg.terms?.minimumPeople || 1
        );

        // 2. Determine Time Slot
        const slotStart = new Date(`${date}T${time}:00.000Z`);
        const slotEnd = new Date(slotStart.getTime() + (pkg.duration_hours || 1) * 60 * 60 * 1000);

        // 3. Smart Boat Allocation using checkUnifiedAvailability
        let assignedBoatId: string | null = null;
        let assignedBoatName = '';
        let maxCapacity = 0;
        let currentPax = 0;

        // First get the IDs of boats assigned to this package
        const { data: assignments } = await supabase
            .from('package_boats')
            .select('boat_id')
            .eq('package_id', packageId);

        const allowedBoatIds = assignments?.map(a => a.boat_id) || [];

        const { available, boat } = await checkUnifiedAvailability({
            from: slotStart.toISOString(),
            to: slotEnd.toISOString(),
            numberOfGuests: totalGuests,
            bookingType: 'daily',
            bufferMinutes: pkg.preparation_buffer || 60,
            allowedBoatIds: allowedBoatIds.length > 0 ? allowedBoatIds : undefined
        });

        if (!available || !boat) {
            return NextResponse.json({
                error: 'No boats with sufficient capacity available for this time slot.'
            }, { status: 409 });
        }

        assignedBoatId = boat.id;
        assignedBoatName = boat.name;
        maxCapacity = boat.max_capacity;
        currentPax = 0; // checkUnifiedAvailability ensures boat has room, but we don't track pax-in-slot yet here correctly if shared.

        // Note: For now, checkUnifiedAvailability handles EXCLUSIVE logic (total pax fits, boat free).
        // If the user wants SHARED cruises, we need to pass a 'allowShared' flag to checkUnifiedAvailability.
        // Given the prompt "up to x will be houseboat, from x up to x will be other big boat", 
        // it sounds like they want the system to pick the RIGHT boat for the group.

        // 4. First Booking Rule (Only applies if starting a FRESH boat)
        if (currentPax === 0 && totalGuests < minCapacity) {
            return NextResponse.json(
                {
                    error: `The first booking for a boat requires at least ${minCapacity} guest(s).`,
                    minCapacity,
                    totalGuests,
                },
                { status: 400 }
            );
        }

        // 5. Insert the booking
        const bookingId = `DT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const { error: insertError } = await supabase.from('bookings').insert({
            id: bookingId,
            daily_travel_package_id: packageId,
            daily_boat_id: assignedBoatId, // LOCK THE BOAT
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone || null,
            client_nif: clientNif || null,       // NEW: Invoice Data
            client_address: clientAddress || null, // NEW: Invoice Data
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            status: 'Pending',
            number_of_guests: totalGuests,
            adults: adults,
            children: children,
            seniors: seniors,
            with_food: body.withFood || false,
            payment_status: 'unpaid',
            source: 'Website - River Cruise',
            notes: `Breakdown: ${adults} Adults, ${children} Children, ${seniors} Seniors. Food: ${body.withFood ? 'YES' : 'NO'}.${menuSelections.length > 0 ? '\nMenus: ' + menuSelections.map((m: any) => `${m.quantity}x ${m.menuId}`).join(', ') : ''
                }`,
        });

        if (insertError) {
            console.error('Booking insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
        }

        // 6. Insert booking_addons
        if (selectedAddons.length > 0) {
            const addonRows = selectedAddons.map((a: any) => ({
                booking_id: bookingId,
                addon_id: a.addonId,
                quantity_adult: a.quantityAdult || 0,
                quantity_child: a.quantityChild || 0,
                quantity_senior: a.quantitySenior || 0,
            }));

            const { error: addonInsertError } = await supabase.from('booking_addons').insert(addonRows);
            if (addonInsertError) console.error('Addon insert error:', addonInsertError);
        }

        // 7. Insert menu_selections (NEW)
        if (pkg.has_food && menuSelections.length > 0) {
            const menuRows = menuSelections.map((m: any) => ({
                booking_id: bookingId,
                menu_id: m.menuId,
                quantity: m.quantity || 1,
                notes: m.notes || null
            }));
            const { error: menuInsertError } = await supabase.from('booking_menu_selections').insert(menuRows);
            if (menuInsertError) console.error('Menu selection insert error:', menuInsertError);
        }

        // 8. Find or create client (Standard Logic)
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

        return NextResponse.json({
            success: true,
            bookingId,
            assignedBoat: assignedBoatName,
            message: 'Booking created successfully.',
            remaining: maxCapacity - currentPax - totalGuests,
        });
    } catch (error) {
        console.error('River cruise booking API error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
