import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest) {
    console.log('[process-document] POST handler invoked');
    try {
        console.log('[process-document] Starting document processing...');

        // Check if API key is configured
        if (!process.env.NER_API_KEY) {
            console.warn('NER_API_KEY environment variable is not set.');
        }

        // Check if NEXT_PUBLIC_TOKEN_ENDPOINT is defined
        if (!process.env.NEXT_PUBLIC_TOKEN_ENDPOINT) {
            console.error('NEXT_PUBLIC_TOKEN_ENDPOINT environment variable is not set.');
            return NextResponse.json(
                {error: 'NEXT_PUBLIC_TOKEN_ENDPOINT environment variable is not set.'},
                {status: 500}
            );
        }
        const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT!;

        // Get the form data from the request
        const formData = await request.formData();
        console.log('[process-document] Form data parsed');
        const file = formData.get('pdf_file') as File;
        const correctionsStr = formData.get('corrections') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const current_loggedin_user = formData.get("current_loggedin_user") as string;
        const api_key = formData.get("api_key") as string;

        console.log('Form data received:', {
            hasFile: !!file,
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
            hasEmail: !!email,
            hasPassword: !!password,
            hasCorrections: !!correctionsStr,
            hasApiKey: !!api_key
        });

        if (!file) {
            console.error('[process-document] No file provided in request');
            return NextResponse.json(
                {error: 'No document provided'},
                {status: 400}
            );
        }

        if (!email || !password) {
            console.error('[process-document] Missing credentials:', {email: !!email, password: !!password});
            return NextResponse.json(
                {error: 'Email and password are required'},
                {status: 400}
            );
        }

        if (!api_key) {
            console.error('[process-document] Missing API key');
            return NextResponse.json(
                {error: 'API key is required'},
                {status: 400}
            );
        }

        console.log('[process-document] Credentials and API key present');

        // Check file type
        const fileType = file.type;
        if (fileType !== 'application/pdf') {
            console.error('Invalid file type:', fileType);
            return NextResponse.json(
                {error: 'Only PDF files are supported'},
                {status: 400}
            );
        }

        console.log('Getting token from /api/token...');
        // Get token from /api/token with credentials
        const tokenResponse = await fetch(tokenEndpoint, {
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
        console.log('[process-document] Token endpoint response received');

        if (!tokenResponse.ok) {
            console.error('[process-document] Token request failed:', tokenResponse.status, await tokenResponse.text());
            throw new Error('Failed to get token');
        }

        const tokenData = await tokenResponse.json();
        console.log('[process-document] Token response:', tokenData);

        if (!tokenData.access_token) {
            console.error('[process-document] No access token in response:', tokenData);
            throw new Error('Invalid token response');
        }

        const token = tokenData.access_token;
        console.log('[process-document] Token received successfully:', token);

        // Create a new FormData without email and password
        const pdfFormData = new FormData();

        // Add the PDF file first
        if (file) {
            console.log('Adding PDF file to FormData:', {
                name: file.name,
                type: file.type,
                size: file.size
            });
            pdfFormData.append("pdf_file", file);
        }

        // Add all other form fields except email and password
        for (const [key, value] of formData.entries()) {
            if (key !== 'email' && key !== 'password' && key !== 'pdf_file') {
                console.log(`Adding form field: ${key}`);
                pdfFormData.append(key, value);
            }
        }

        console.log('FormData contents:', {
            hasPdfFile: pdfFormData.has('pdf_file'),
            hasAgentConfig: pdfFormData.has('agent_config_file'),
            hasTaskConfig: pdfFormData.has('task_config_file'),
            hasEmbedderConfig: pdfFormData.has('embedder_config_file'),
            hasKnowledgeConfig: pdfFormData.has('knowledge_config_file')
        });

        // Add the API key to the request headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': api_key
        };

        // Add retry logic for the external API call
        const maxRetries = 3;
        let retryCount = 0;
        let externalResponse;


        while (retryCount < maxRetries) {
            try {
                const endpoint = process.env.NEXT_PUBLIC_STRUCTSENSE_ENDPOINT;
                if (!endpoint) {
                    throw new Error("NEXT_PUBLIC_STRUCTSENSE_ENDPOINT is not defined in the environment variables.");
                }

                console.log(`Calling external API with token (attempt ${retryCount + 1}/${maxRetries})...`);
                externalResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: pdfFormData,
                    // Add timeout
                    signal: AbortSignal.timeout(3600000) // 1hr minutes timeout
                });
                console.log('[process-document] External API response received');

                if (externalResponse.ok) {
                    break;
                }

                // If response is not ok, throw error to trigger retry
                throw new Error(`API call failed with status ${externalResponse.status}`);
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    console.error('[process-document] All retry attempts failed:', error);
                    throw error;
                }
                console.log(`Retry attempt ${retryCount} after error:`, error);
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
        }

        if (!externalResponse) {
            console.error('[process-document] No response from external API after all retries');
            throw new Error('Failed to get response from external API after all retries');
        }

        console.log('[process-document] External API call successful');
        const data = await externalResponse.json();
        console.log('[process-document] Data received from external API:', data);

        // Define the type for the transformed data
        interface TransformedData {
            entities: Record<string, any[]>;
            documentName?: string;
            processedAt?: string;
            corrected?: boolean;
        }

        // Transform the response format to match what the frontend expects
        const transformedData: TransformedData = {
            entities: {}
        };

        if (data.judged_structured_information) {
            // Process all sections and collect all entities
            const allEntities: any[] = [];

            // First, collect all entities from all sections
            Object.values(data.judged_structured_information).forEach((section: any) => {
                if (Array.isArray(section)) {
                    allEntities.push(...section);
                }
            });

            // Then group them by entity type
            allEntities.forEach((entity: any) => {
                const entityType = entity.label || 'UNKNOWN';

                if (!transformedData.entities[entityType]) {
                    transformedData.entities[entityType] = [];
                }

                transformedData.entities[entityType].push({
                    entity: entity.entity,
                    entityType: entity.label,
                    originalEntityType: entity.label,
                    start: entity.start,
                    end: entity.end,
                    sentence: entity.sentence,
                    paper_location: entity.paper_location || '',
                    paper_title: entity.paper_title || '',
                    doi: entity.doi || '',
                    ontology_id: entity.ontology_id || null,
                    ontology_label: entity.ontology_label || null,
                    judge_score: entity.judge_score || 0,
                    feedback: 'up',
                    contributed_by: current_loggedin_user,
                    changed_by: [current_loggedin_user]
                });
            });
        }

        console.log("logged in user: " + current_loggedin_user);

        // Add document metadata
        transformedData.documentName = file.name;
        transformedData.processedAt = new Date().toISOString();

        console.log('[process-document] Processing complete, returning response');
        return NextResponse.json(transformedData);

    } catch (error) {
        console.error('[process-document] Error in document processing:', error);
        return NextResponse.json(
            {error: 'Failed to process document'},
            {status: 500}
        );
    }
}