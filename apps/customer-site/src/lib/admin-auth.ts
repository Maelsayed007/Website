import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface AdminUser {
    id: string;
    username: string;
    displayName: string | null;
    role: 'super_admin' | 'manager' | 'staff';
    permissions: {
        canViewDashboard: boolean;
        canViewBookings: boolean;
        canEditBookings: boolean;
        canDeleteBookings: boolean;
        canManagePayments: boolean;
        canViewSettings: boolean;
        canEditSettings: boolean;
        canManageUsers: boolean;
    };
    isActive: boolean;
    lastLogin: string | null;
}

const SESSION_DURATION_HOURS = 8;
const SESSION_COOKIE_NAME = 'admin_session';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
    const supabase = createAdminClient();
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    await supabase.from('admin_sessions').insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString()
    });

    // Update last login
    await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

    return token;
}

/**
 * Validate a session token and return the user
 */
export async function validateSession(): Promise<AdminUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const supabase = createAdminClient();

    // Find session and join with user
    const { data: session, error } = await supabase
        .from('admin_sessions')
        .select(`
            *,
            admin_users (*)
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !session || !session.admin_users) {
        return null;
    }

    const user = session.admin_users;
    if (!user.is_active) return null;

    return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        permissions: user.permissions,
        isActive: user.is_active,
        lastLogin: user.last_login
    };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
    const supabase = createAdminClient();
    await supabase.from('admin_sessions').delete().eq('token', token);
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: false, // Forcing false to debug local login issue
        sameSite: 'lax',
        maxAge: SESSION_DURATION_HOURS * 60 * 60,
        path: '/'
    });
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AdminUser, permission: keyof AdminUser['permissions']): boolean {
    // SuperAdmin always has all permissions
    if (user.role === 'super_admin') return true;
    return user.permissions[permission] === true;
}

/**
 * Get the session cookie name (for middleware)
 */
export function getSessionCookieName(): string {
    return SESSION_COOKIE_NAME;
}
