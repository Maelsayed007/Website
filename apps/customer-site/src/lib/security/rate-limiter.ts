'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Check if an authentication attempt should be allowed based on rate limiting rules
 * Returns true if the attempt is allowed, false if rate limited
 */
export async function checkRateLimit(email: string, ip: string): Promise<boolean> {
    try {
        const supabase = createAdminClient();

        // Check failed attempts in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { count, error } = await supabase
            .from('auth_attempts')
            .select('*', { count: 'exact', head: true })
            .or(`email.eq.${email},ip_address.eq.${ip}`)
            .eq('success', false)
            .gte('created_at', fifteenMinutesAgo);

        if (error) {
            console.error('[Rate Limiter] Error checking rate limit:', error);
            return true; // Allow on error to prevent lockouts
        }

        // Allow max 5 failed attempts per 15 minutes
        return (count ?? 0) < 5;
    } catch (error) {
        console.error('[Rate Limiter] Exception:', error);
        return true; // Allow on error
    }
}

/**
 * Log an authentication attempt for rate limiting purposes
 */
export async function logAuthAttempt(
    email: string,
    ip: string,
    success: boolean
): Promise<void> {
    try {
        const supabase = createAdminClient();

        await supabase.from('auth_attempts').insert({
            email,
            ip_address: ip,
            success,
        });
    } catch (error) {
        console.error('[Rate Limiter] Failed to log auth attempt:', error);
    }
}

/**
 * Check if a specific email/IP is currently rate limited
 * Returns the number of seconds until the rate limit expires, or 0 if not limited
 */
export async function getRateLimitStatus(email: string, ip: string): Promise<{
    isLimited: boolean;
    attemptsRemaining: number;
    resetInSeconds: number;
}> {
    try {
        const supabase = createAdminClient();
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('auth_attempts')
            .select('created_at')
            .or(`email.eq.${email},ip_address.eq.${ip}`)
            .eq('success', false)
            .gte('created_at', fifteenMinutesAgo)
            .order('created_at', { ascending: true });

        if (error || !data) {
            return { isLimited: false, attemptsRemaining: 5, resetInSeconds: 0 };
        }

        const attemptCount = data.length;
        const isLimited = attemptCount >= 5;
        const attemptsRemaining = Math.max(0, 5 - attemptCount);

        let resetInSeconds = 0;
        if (isLimited && data.length > 0) {
            const oldestAttempt = new Date(data[0].created_at);
            const resetTime = new Date(oldestAttempt.getTime() + 15 * 60 * 1000);
            resetInSeconds = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
        }

        return { isLimited, attemptsRemaining, resetInSeconds };
    } catch (error) {
        console.error('[Rate Limiter] Error getting status:', error);
        return { isLimited: false, attemptsRemaining: 5, resetInSeconds: 0 };
    }
}
