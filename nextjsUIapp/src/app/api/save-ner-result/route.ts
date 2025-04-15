import { NextRequest, NextResponse } from 'next/server';

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

        if (!email || !password) {
            console.error('Missing credentials:', { email: !!email, password: !!password });
            return NextResponse.json(
                {error: 'Email and password are required'},
                {status: 400}
            );
        }

        console.log('Getting token from /api/token...');
        // Get token from /api/token with credentials
        const tokenResponse = await fetch(process.env.NEXT_PUBLIC_TOKEN_ENDPOINT || 'http://localhost:8007/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            }),
            // Add timeout
            signal: AbortSignal.timeout(30000) // 30 seconds timeout
        });

        if (!tokenResponse.ok) {
            console.error('Token request failed:', tokenResponse.status, await tokenResponse.text());
            throw new Error('Failed to get token');
        }

        const tokenData = await tokenResponse.json();
        console.log('Token response:', tokenData);

        if (!tokenData.access_token) {
            console.error('No access token in response:', tokenData);
            throw new Error('Invalid token response');
        }

        const token = tokenData.access_token;
        console.log('Token received successfully:', token);

        // Add retry logic for the external API call
        const maxRetries = 3;
        let retryCount = 0;
        let externalResponse;

        while (retryCount < maxRetries) {
            try {
                console.log(`Calling external API with token (attempt ${retryCount + 1}/${maxRetries})...`);
                externalResponse = await fetch(process.env.NEXT_PUBLIC_NER_SAVE_ENDPOINT || 'http://localhost:8007/api/multiagent/result/save', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: resultsJson,
                    // Add timeout
                    signal: AbortSignal.timeout(360000) // 6 minutes timeout
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
