import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getData } from '@/src/app/components/utils/getData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const endpoint = env.namedGraphQueryEndpoint;

        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_NAMED_GRAPH_QUERY_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // Use getData server-side (no CORS issues)
        // Empty query_parameter means simple GET request
        // useAuth: false since this is a public endpoint
        const response = await getData({}, endpoint, false, 'query');

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('[Registered Named Graphs API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch registered named graphs'
            },
            { status: 500 }
        );
    }
}

