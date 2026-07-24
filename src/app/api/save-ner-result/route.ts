import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { env } from '../../../config/env';
import { getAuthTokenForService, getAuthTokenWithCredentials } from '../../../utils/api/auth';

export async function POST(request: NextRequest) {
    try {
        console.log('Starting document processing...');

        // Get the form data from the request
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const resultsJson = formData.get('results') as string;

        if (!resultsJson) {
            return NextResponse.json(
                { error: 'No results data provided' },
                { status: 400 }
            );
        }

        const results = JSON.parse(resultsJson);

        // Prefer the logged-in user's session (SSO session-exchange → ml_service
        // token); fall back to form credentials only if there is no session
        // (deprecated — removed once backend password login is retired).
        let token = await getAuthTokenForService('ml');
        if (!token) {
            if (!email || !password) {
                return NextResponse.json(
                    { error: 'Not authenticated. Sign in, or provide credentials.' },
                    { status: 401 }
                );
            }
            const tokenEndpoint = env.tokenEndpointMLService || 'http://localhost:8007/api/token';
            token = await getAuthTokenWithCredentials(tokenEndpoint, email, password, 'ML');
        }
        console.log('Token obtained (session or credentials)');

        // Add retry logic for the external API call
        const maxRetries = 3;
        let retryCount = 0;
        let externalResponse;

        while (retryCount < maxRetries) {
            try {
                console.log(`Calling external API with token (attempt ${retryCount + 1}/${maxRetries})...`);
                const nerSaveEndpoint = env.nerSaveEndpoint || 'http://localhost:8009/api/save/ner';
                externalResponse = await fetch(nerSaveEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: resultsJson,
                    // Add timeout
                    signal: AbortSignal.timeout(3600000) // 6 minutes timeout
                });

                if (externalResponse.ok) {
                    break;
                }

                // If response is not ok, throw error to trigger retry
                throw new Error(`API call failed with status ${externalResponse.status}`);
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    console.error('All retry attempts failed:', error);
                    throw error;
                }
                console.log(`Retry attempt ${retryCount} after error:`, error);
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
        }

        if (!externalResponse) {
            throw new Error('Failed to get response from external API after all retries');
        }

        console.log('External API call successful');
        const data = await externalResponse.json();

        // Invalidate NER cache tags after successful save
        try {
            // Invalidate common tags that cover all NER caches
            revalidateTag('ner-all');
            revalidateTag('ner-lists');
            revalidateTag('ner-entities');
            console.log('[save-ner-result] NER cache invalidated successfully');
        } catch (cacheError) {
            console.error('[save-ner-result] Error invalidating cache:', cacheError);
            // Don't fail the request if cache invalidation fails
        }

        return NextResponse.json({
            success: true,
            message: 'Results saved successfully',
            data
        });

    } catch (error) {
        console.error('Error saving NER results:', error);
        return NextResponse.json(
            { error: 'Failed to save results' },
            { status: 500 }
        );
    }
}
