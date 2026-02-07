import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await validateSession();

        if (!user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error('Session check error:', error);
        return NextResponse.json(
            { error: 'Session validation failed' },
            { status: 500 }
        );
    }
}
