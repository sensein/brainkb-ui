import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getData } from '@/src/app/components/utils/getData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('user_id');
        const jobId = searchParams.get('job_id');

        if (!userId || !jobId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'user_id and job_id are required'
                },
                { status: 400 }
            );
        }

        const endpoint = env.kgAllJobsStatusEndpoint;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_ADMIN_INSERT_ALL_KGS_JSONLD_TTL_JOB_STATUS_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // Build URL with query parameters
        const url = new URL(endpoint);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('job_id', jobId);

        // Use getData server-side (no CORS issues)
        const response = await getData({}, url.toString(), true, 'query');

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('[Job Details API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch job details'
            },
            { status: 500 }
        );
    }
}

