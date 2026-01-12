import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { withAuthHeaders } from '@/src/utils/api/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('user_id');
        const jobId = searchParams.get('job_id');
        const maxAgeHours = searchParams.get('max_age_hours') || '2.0';

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'user_id is required'
                },
                { status: 400 }
            );
        }

        const endpoint = env.kgRecoveryJobEndpoint;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_ADMIN_INSERT_RECOVERY_JOB_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // Build URL with query parameters
        const url = new URL(endpoint);
        url.searchParams.set('user_id', userId);
        url.searchParams.set('max_age_hours', maxAgeHours);
        if (jobId) {
            url.searchParams.set('job_id', jobId);
        }

        // Get authentication headers
        const authHeaders = await withAuthHeaders('query');

        // Make POST request with authentication
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...authHeaders,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('[Job Recovery API] Error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to recover job'
            },
            { status: 500 }
        );
    }
}

