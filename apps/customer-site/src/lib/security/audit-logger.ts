'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

/**
 * Security action types for audit logging
 */
export type SecurityAction =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'permission_denied'
    | 'booking_created'
    | 'booking_modified'
    | 'booking_deleted'
    | 'settings_changed'
    | 'user_created'
    | 'user_deleted'
    | 'password_changed'
    | 'suspicious_activity';

/**
 * Log a security event to the database for audit purposes
 * This function is designed to never throw - security logging should not break the app
 */
export async function logSecurityEvent(
    action: SecurityAction,
    userId?: string | null,
    metadata?: Record<string, unknown>
): Promise<void> {
    try {
        const headersList = await headers();
        const supabase = createAdminClient();

        await supabase.from('security_logs').insert({
            user_id: userId || null,
            action,
            ip_address: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
            user_agent: headersList.get('user-agent') || 'unknown',
            metadata: metadata || null,
        });
    } catch (error) {
        // Silent fail - audit logging should never break the application
        console.error('[Security Audit] Failed to log event:', action, error);
    }
}

/**
 * Log a permission denied event with context
 */
export async function logPermissionDenied(
    userId: string | null,
    attemptedAction: string,
    resource: string
): Promise<void> {
    await logSecurityEvent('permission_denied', userId, {
        attemptedAction,
        resource,
        timestamp: new Date().toISOString(),
    });
}
