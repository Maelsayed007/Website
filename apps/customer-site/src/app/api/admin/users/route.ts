import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSession, hasPermission, hashPassword } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET - List all users (SuperAdmin only)
export async function GET() {
    try {
        const user = await validateSession();
        if (!user || !hasPermission(user, 'canManageUsers')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('admin_users')
            .select('id, username, display_name, role, permissions, is_active, last_login, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ users: data });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new user (SuperAdmin only)
export async function POST(request: Request) {
    try {
        const user = await validateSession();
        if (!user || !hasPermission(user, 'canManageUsers')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password, displayName, role, permissions } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Check if username exists
        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('username', username.toLowerCase().trim())
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Username already exists' },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                username: username.toLowerCase().trim(),
                password_hash: passwordHash,
                display_name: displayName || username,
                role: role || 'staff',
                permissions: permissions || {
                    canViewDashboard: true,
                    canViewBookings: true,
                    canEditBookings: false,
                    canDeleteBookings: false,
                    canManagePayments: false,
                    canViewSettings: false,
                    canEditSettings: false,
                    canManageUsers: false
                }
            })
            .select('id, username, display_name, role, permissions')
            .single();

        if (error) throw error;

        return NextResponse.json({ user: data });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update user (SuperAdmin only)
export async function PUT(request: Request) {
    try {
        const user = await validateSession();
        if (!user || !hasPermission(user, 'canManageUsers')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, displayName, role, permissions, password, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (displayName !== undefined) updateData.display_name = displayName;
        if (role !== undefined) updateData.role = role;
        if (permissions !== undefined) updateData.permissions = permissions;
        if (isActive !== undefined) updateData.is_active = isActive;

        // If password is being changed
        if (password && password.length >= 8) {
            updateData.password_hash = await hashPassword(password);
        }

        const { data, error } = await supabase
            .from('admin_users')
            .update(updateData)
            .eq('id', id)
            .select('id, username, display_name, role, permissions, is_active')
            .single();

        if (error) throw error;

        return NextResponse.json({ user: data });
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Deactivate user (SuperAdmin only)
export async function DELETE(request: Request) {
    try {
        const user = await validateSession();
        if (!user || !hasPermission(user, 'canManageUsers')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Prevent self-deletion
        if (id === user.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Soft delete - just deactivate
        const { error } = await supabase
            .from('admin_users')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;

        // Delete all sessions for this user
        await supabase.from('admin_sessions').delete().eq('user_id', id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
