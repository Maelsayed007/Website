import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, clearSessionCookie, getSessionCookieName } from '@/lib/admin-auth';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(getSessionCookieName())?.value;

        if (token) {
            await deleteSession(token);
        }

        await clearSessionCookie();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}
