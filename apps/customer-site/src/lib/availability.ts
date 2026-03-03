import { createAdminClient } from './supabase/admin';

/**
 * Unified availability check for all boat types (Houseboats, Daily Boats, etc.)
 * Handles:
 * 1. Capacity filtering (Min/Max people)
 * 2. Mandatory Boat/Model assignments
 * 3. Temporal overlap with preparation buffers
 */
export async function checkUnifiedAvailability(params: {
    from: string;
    to: string;
    numberOfGuests: number;
    bookingType: 'overnight' | 'daily';
    bufferMinutes?: number;
    allowedBoatIds?: string[];
    allowedModelIds?: string[];
}): Promise<{ available: boolean; boat?: any }> {
    const supabase = createAdminClient();
    const { from, to, numberOfGuests, bufferMinutes = 0, allowedBoatIds, allowedModelIds } = params;

    // Preparation Buffer: Expand the requested window if it's a daily booking
    const requestStart = new Date(from);
    const requestEnd = new Date(to);

    const checkStart = new Date(requestStart.getTime() - (bufferMinutes * 60000));
    const checkEnd = new Date(requestEnd.getTime() + (bufferMinutes * 60000));

    // 1. Fetch ALL potential boats from both tables
    const [houseboatsRes, dailyBoatsRes] = await Promise.all([
        supabase.from('boats').select('*, model:houseboat_models(*)'),
        supabase.from('daily_boats').select('*')
    ]);

    const allBoats = [
        ...(houseboatsRes.data || []).map(b => ({
            id: b.id,
            name: b.name,
            min_capacity: b.model?.min_capacity || b.model?.optimalCapacity || 1,
            max_capacity: b.model?.max_capacity || b.model?.maximumCapacity || 12,
            type: 'houseboat',
            model_id: b.model_id
        })),
        ...(dailyBoatsRes.data || []).map(b => ({
            ...b,
            type: 'daily'
        }))
    ];

    // 2. Filter boats by capacity & assignments
    const suitableBoats = allBoats.filter(boat => {
        // Capacity check
        if (numberOfGuests < (boat.min_capacity || 0) || numberOfGuests > (boat.max_capacity || 999)) return false;

        // Assignment check (Boat ID OR Model ID)
        if (allowedBoatIds && allowedBoatIds.length > 0) {
            const isBoatIdMatch = allowedBoatIds.includes(boat.id);
            const isModelIdMatch = boat.model_id && allowedBoatIds.includes(boat.model_id);
            if (!isBoatIdMatch && !isModelIdMatch) return false;
        }

        // Specific Model assignment check (Original allowedModelIds param)
        if (boat.type === 'houseboat' && allowedModelIds && allowedModelIds.length > 0 && !allowedModelIds.includes(boat.model_id)) return false;

        return true;
    });

    if (suitableBoats.length === 0) return { available: false };

    // 3. Get all non-cancelled bookings for these specific boat IDs
    // We check all booking types (overnight & daily) to ensure no cross-conflicts
    const boatIds = suitableBoats.map(b => b.id);
    const { data: bookings } = await supabase
        .from('bookings')
        .select('houseboat_id, daily_boat_id, start_time, end_time')
        .or(`houseboat_id.in.(${boatIds.join(',')}),daily_boat_id.in.(${boatIds.join(',')})`)
        .neq('status', 'Cancelled');

    if (!bookings) return { available: true, boat: suitableBoats[0] };

    // 4. Find the first boat that has no overlapping bookings within the buffered window
    for (const boat of suitableBoats) {
        const hasOverlap = bookings.some(b => {
            // Check if this booking is for THIS boat
            const bBoatId = b.houseboat_id || b.daily_boat_id;
            if (bBoatId !== boat.id) return false;

            const bStart = new Date(b.start_time);
            const bEnd = new Date(b.end_time);

            // Standard overlap check: (StartA < EndB) && (EndA > StartB)
            return checkStart < bEnd && checkEnd > bStart;
        });

        if (!hasOverlap) {
            return { available: true, boat };
        }
    }

    return { available: false };
}

export async function shouldAutoConfirm(type: 'houseboat' | 'restaurant' | 'travel', details: any): Promise<boolean> {
    if (type === 'houseboat' || type === 'travel') {
        const { available } = await checkUnifiedAvailability({
            from: details.from,
            to: details.to,
            numberOfGuests: details.numberOfGuests || 2,
            bookingType: type === 'houseboat' ? 'overnight' : 'daily',
            bufferMinutes: details.bufferMinutes || 0,
            allowedBoatIds: details.allowedBoatIds,
            allowedModelIds: details.allowedModelIds
        });
        return available;
    }
    return false;
}
