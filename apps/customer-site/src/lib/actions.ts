
'use server';

import { generateHouseboatDescription, type GenerateHouseboatDescriptionInput } from '@/ai/flows/generate-houseboat-descriptions';
import { createClient } from '@/lib/supabase/server';

export async function getAIDescription(data: GenerateHouseboatDescriptionInput) {
    try {
        const result = await generateHouseboatDescription(data);
        return { success: true, description: result.description };
    } catch (error) {
        console.error('Error generating AI description:', error);
        return { success: false, error: 'Failed to generate description.' };
    }
}

type ActivityLogInput = {
    userId: string;
    username: string;
    action: string;
    details: string;
    path?: string;
}

export async function logActivity(data: ActivityLogInput) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.from('activity_logs').insert([{
            ...data,
            timestamp: new Date().toISOString(),
        }]);
        if (error) throw error;
    } catch (e) {
        console.error("Failed to log activity:", e);
        // We typically don't want to throw an error here and block the user's main action
        // because logging failed.
    }
}
