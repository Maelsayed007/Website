import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/admin-auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Find user by username
        const { data: user, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username.toLowerCase().trim())
            .eq('is_active', true)
            .single();

        if (error || !user) {
            // Generic error to prevent username enumeration
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Create session
        const token = await createSession(user.id);
        await setSessionCookie(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
