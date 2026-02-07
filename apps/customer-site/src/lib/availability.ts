import { createAdminClient } from './supabase/admin';

export async function checkHouseboatAvailability(
    modelId: string,
    from: string,
    to: string
): Promise<{ available: boolean; boatId?: string }> {
    const supabase = createAdminClient();
    const startDate = new Date(from);
    const endDate = new Date(to);

    // 1. Get all boats for this model
    const { data: boats } = await supabase
        .from('boats')
        .select('id')
        .eq('model_id', modelId);

    if (!boats || boats.length === 0) return { available: false };

    // 2. Get all non-cancelled bookings for these boats that overlap
    const { data: bookings } = await supabase
        .from('bookings')
        .select('houseboat_id, start_time, end_time')
        .in('houseboat_id', boats.map(b => b.id))
        .neq('status', 'Cancelled');

    if (!bookings) return { available: true, boatId: boats[0].id };

    // 3. Find a boat that has no overlapping bookings
    for (const boat of boats) {
        const hasOverlap = bookings.some(b => {
            if (b.houseboat_id !== boat.id) return false;
            const bStart = new Date(b.start_time);
            const bEnd = new Date(b.end_time);
            return startDate < bEnd && endDate > bStart;
        });

        if (!hasOverlap) {
            return { available: true, boatId: boat.id };
        }
    }

    return { available: false };
}

export async function shouldAutoConfirm(type: 'houseboat' | 'restaurant' | 'travel', details: any): Promise<boolean> {
    // Logic for auto-confirmation:
    // For houseboats, if a boat is available and it's a standard booking, we can auto-confirm.
    // In the future, this can include more complex rules (e.g. client history, payment status).

    if (type === 'houseboat') {
        const { available } = await checkHouseboatAvailability(details.modelId, details.from, details.to);
        return available;
    }

    // Default to false for other types for now
    return false;
}
