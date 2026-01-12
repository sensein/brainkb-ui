import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { withAuthHeaders } from '@/src/utils/api/auth';

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

        const endpoint = env.kgCheckRecoverableJobEndpoint;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_ADMIN_INSERT_CHECK_RECOVERABLE_JOB_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // Build URL with query parameters
        const url = new URL(endpoint);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('job_id', jobId);

        // Get authentication headers
        const authHeaders = await withAuthHeaders('query');

        // Make GET request with authentication
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...authHeaders,
            },
        });

        // Handle 404 specifically - job doesn't exist on backend
        if (response.status === 404) {
            return NextResponse.json({
                success: false,
                recoverable: false,
                unrecoverable: true,
                reason: 'Job not found on backend',
                process_running: false
            }, { status: 200 }); // Return 200 with unrecoverable status
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('[Job Check Recoverable API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to check if job is recoverable'
            },
            { status: 500 }
        );
    }
}




