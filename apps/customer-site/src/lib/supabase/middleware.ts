import { NextResponse, type NextRequest } from 'next/server';

function addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
}

export async function updateSession(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    addSecurityHeaders(response);
    return response;
}
