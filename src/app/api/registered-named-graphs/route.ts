import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getAuthTokenForService } from '@/src/utils/api/auth';

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

        // Direct fetch to avoid any potential issues with ApiService
        // Try with authentication first, as the backend might require it
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        // Try to get auth token (even though endpoint might not require it)
        if (env.useBearerToken) {
            try {
                const token = await getAuthTokenForService('query');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                // Continue without auth if token fetch fails
            }
        }
        
        const backendResponse = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
            cache: 'no-store',
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            throw new Error(`Backend returned ${backendResponse.status}: ${errorText}`);
        }

        const responseText = await backendResponse.text();

        if (!responseText || responseText.trim() === '') {
            return NextResponse.json({}, { status: 200 });
        }

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Failed to parse backend response as JSON: ${parseError}`);
        }

        // Return the response directly - it should be the object/array from the backend
        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        const err = error as Error;
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch registered named graphs'
            },
            { status: 500 }
        );
    }
}

