import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getData } from '@/src/app/components/utils/getData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('user_id');
        const limit = searchParams.get('limit') || '100';
        const offset = searchParams.get('offset') || '0';

        const endpoint = env.kgJobStatusEndpoint;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // Build URL with query parameters
        const url = new URL(endpoint);
        if (userId) {
            url.searchParams.set('user_id', userId);
        }
        url.searchParams.set('limit', limit);
        url.searchParams.set('offset', offset);

        // Use getData server-side (no CORS issues)
        const response = await getData({}, url.toString(), true, 'query');

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('[Job Status API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch job status'
            },
            { status: 500 }
        );
    }
}

