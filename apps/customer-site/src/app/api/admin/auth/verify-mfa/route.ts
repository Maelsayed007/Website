import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSession, setSessionCookie } from '@/lib/admin-auth';
import {
    clearRateLimit,
    getRateLimitState,
    registerRateLimitFailure,
} from '@/lib/security/rate-limit';
import {
    getClientIp,
    getMfaSecretForUser,
    verifyMfaChallengeToken,
    verifyTotpCode,
} from '@/lib/security/mfa';
import { normalizePermissions } from '@/lib/auth/permissions';

function buildMfaRateLimitKey(username: string, ip: string) {
    return `admin-mfa:${username}:${ip}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const challengeToken = String(body?.challengeToken || '');
        const code = String(body?.code || '');
        const ip = getClientIp(request);

        if (!challengeToken || !code) {
            return NextResponse.json(
                { error: 'Challenge token and MFA code are required.' },
                { status: 400 }
            );
        }

        const challenge = verifyMfaChallengeToken(challengeToken, ip);
        if (!challenge) {
            return NextResponse.json({ error: 'Invalid or expired MFA challenge.' }, { status: 401 });
        }

        const rateLimitKey = buildMfaRateLimitKey(challenge.username, ip);
        const state = getRateLimitState(rateLimitKey);
        if (state.locked) {
            return NextResponse.json(
                {
                    error: `Too many code attempts. Try again in ${state.retryAfterSeconds} seconds.`,
                },
                { status: 429 }
            );
        }

        const supabase = createAdminClient();
        const { data: user, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', challenge.userId)
            .eq('is_active', true)
            .single();

        if (error || !user) {
            registerRateLimitFailure(rateLimitKey);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const mfaSecret = getMfaSecretForUser({
            userId: user.id,
            username: user.username,
        });

        if (!mfaSecret || !verifyTotpCode(mfaSecret, code)) {
            registerRateLimitFailure(rateLimitKey);
            return NextResponse.json({ error: 'Invalid MFA code.' }, { status: 401 });
        }

        clearRateLimit(rateLimitKey);

        const token = await createSession(user.id);
        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
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
    } catch (error: any) {
        console.error('MFA verification error:', error);
        return NextResponse.json({ error: 'MFA verification failed.' }, { status: 500 });
    }
}
