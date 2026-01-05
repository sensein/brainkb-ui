import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getAuthTokenForService, TokenEndpointType } from '@/src/utils/api/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const tokenEndpointType = (body.tokenEndpointType as TokenEndpointType) || 'default';

        // Get token server-side (no CORS issues)
        const token = await getAuthTokenForService(tokenEndpointType);

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Failed to get authentication token for ${tokenEndpointType} service`
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                token: token
            },
            { status: 200 }
        );
    } catch (error) {
        const err = error as Error;
        console.error('[Auth Token API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch authentication token'
            },
            { status: 500 }
        );
    }
}

