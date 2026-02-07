'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createStaffUserAction(formData: any) {
    const { password, username, permissions } = formData;

    // Generate an internal email from the username
    const internalEmail = `${username.toLowerCase().replace(/\s+/g, '')}@staff.amieira.local`;

    try {
        const supabaseAdmin = createAdminClient();

        // 1. Create User in Auth with generated email
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password,
            email_confirm: true,
            user_metadata: { username }
        });

        if (authError) throw authError;

        // 2. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                username,
                email: internalEmail,
                permissions: permissions || {
                    isSuperAdmin: false,
                    canViewDashboard: true,
                    canViewHouseboatReservations: true,
                    canEditHouseboatReservations: false
                }
            });

        if (profileError) {
            // Cleanup auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        revalidatePath('/dashboard/settings/staff');
        return { success: true };
    } catch (error: any) {
        console.error('Error creating staff user:', error);
        return { success: false, error: error.message };
    }
}


export async function updateStaffPermissionsAction(userId: string, permissions: any) {
    try {
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ permissions })
            .eq('id', userId);

        if (error) throw error;

        revalidatePath('/dashboard/settings/staff');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

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
