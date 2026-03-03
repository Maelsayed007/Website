'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function deleteUserAction(userId: string) {
    try {
        const supabaseAdmin = createAdminClient();

        // 1. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        // 2. Profile is deleted via CASCADE in DB (if foreign key has ON DELETE CASCADE)
        // If not, we do it manually:
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        revalidatePath('/dashboard/settings/staff');
        revalidatePath('/dashboard/clients');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserEmailAction(userId: string, newEmail: string) {
    try {
        const supabaseAdmin = createAdminClient();

        // 1. Update in Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: newEmail,
            email_confirm: true
        });
        if (authError) throw authError;

        // 2. Update in Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ email: newEmail })
            .eq('id', userId);

        if (profileError) throw profileError;

        revalidatePath('/dashboard/settings/staff');
        revalidatePath('/dashboard/clients');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating email:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserPasswordAction(userId: string, newPassword: string) {
    try {
        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Error updating password:', error);
        return { success: false, error: error.message };
    }
}
