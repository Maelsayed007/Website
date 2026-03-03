import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/admin-auth';
import {
    clearRateLimit,
    getRateLimitState,
    registerRateLimitFailure,
} from '@/lib/security/rate-limit';
import {
    createMfaChallengeToken,
    getClientIp,
    getMfaSecretForUser,
} from '@/lib/security/mfa';
import { normalizePermissions } from '@/lib/auth/permissions';

function buildRateLimitKey(username: string, ip: string) {
    return `admin-login:${username}:${ip}`;
}

function isMfaRequired(): boolean {
    return process.env.ADMIN_REQUIRE_MFA === 'true';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const username = String(body?.username || '').toLowerCase().trim();
        const password = String(body?.password || '');
        const ip = getClientIp(request);

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const rateLimitKey = buildRateLimitKey(username, ip);
        const state = getRateLimitState(rateLimitKey);
        if (state.locked) {
            return NextResponse.json(
                {
                    error: `Too many attempts. Try again in ${state.retryAfterSeconds} seconds.`,
                },
                { status: 429 }
            );
        }

        const supabase = createAdminClient();

        // Find user by username
        const { data: user, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (error || !user) {
            registerRateLimitFailure(rateLimitKey);
            // Generic error to prevent username enumeration
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            registerRateLimitFailure(rateLimitKey);
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (!isMfaRequired()) {
            const token = await createSession(user.id);
            await setSessionCookie(token);

            clearRateLimit(rateLimitKey);

            return NextResponse.json({
                success: true,
                requiresMfa: false,
                user: {
                    id: user.id,
                    username: user.username,
                    displayName: user.display_name,
                    role: user.role,
                    permissions: normalizePermissions({
                        role: user.role,
                        permissions: user.permissions,
                    }),
                },
            });
        }

        const mfaSecret = getMfaSecretForUser({
            userId: user.id,
            username: user.username,
        });
        if (!mfaSecret) {
            registerRateLimitFailure(rateLimitKey);
            return NextResponse.json(
                { error: 'MFA is required but not configured for this staff account.' },
                { status: 403 }
            );
        }

        const challengeToken = createMfaChallengeToken({
            userId: user.id,
            username: user.username,
            ip,
        });

        clearRateLimit(rateLimitKey);

        return NextResponse.json({
            success: true,
            requiresMfa: true,
            challengeToken,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                role: user.role,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
