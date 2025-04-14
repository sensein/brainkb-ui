import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('Starting document processing...');
        
        // Check if API key is configured
        if (!process.env.NER_API_KEY) {
            console.warn('NER_API_KEY environment variable is not set.');
        }

        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get('pdf_file') as File;
        const correctionsStr = formData.get('corrections') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const current_loggedin_user = formData.get("current_loggedin_user") as string;

        console.log('Form data received:', {
            hasFile: !!file,
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
            hasEmail: !!email,
            hasPassword: !!password,
            hasCorrections: !!correctionsStr
        });

        if (!file) {
            console.error('No file provided in request');
            return NextResponse.json(
                {error: 'No document provided'},
                {status: 400}
            );
        }

        if (!email || !password) {
            console.error('Missing credentials:', { email: !!email, password: !!password });
            return NextResponse.json(
                {error: 'Email and password are required'},
                {status: 400}
            );
        }
        console.log("logged in user:",{current_loggedin_user});

        // Check file type
        const fileType = file.type;
        if (fileType !== 'application/pdf') {
            console.error('Invalid file type:', fileType);
            return NextResponse.json(
                {error: 'Only PDF and text files are supported'},
                {status: 400}
            );
        }

        console.log('Getting token from /api/token...');
        // Get token from /api/token with credentials
        const tokenResponse = await fetch(process.env.NEXT_PUBLIC_TOKEN_ENDPOINT, {
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
        console.log(formData);

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

        // Add retry logic for the external API call
        const maxRetries = 3;
        let retryCount = 0;
        let externalResponse;

        while (retryCount < maxRetries) {
            try {
                console.log(`Calling external API with token (attempt ${retryCount + 1}/${maxRetries})...`);
                externalResponse = await fetch(process.env.NEXT_PUBLIC_STRUCTSENSE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: pdfFormData,
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

        // Define the type for the transformed data
        interface TransformedData {
            entities: Record<string, any[]>;
            documentName?: string;
            processedAt?: string;
            corrected?: boolean;
        }

        // Transform the response format to match what the frontend expects
        const transformedData: TransformedData = {
            entities: Object.entries(data.judged_structured_information).reduce((acc, [key, items]) => {
                // Convert each item to the expected format
                const transformedItems = (items as any[]).map(item => ({
                    entity: item.entity,
                    originalEntityType: item.label,
                    entityType: item.label,
                    start: item.start,
                    end: item.end,
                    sentence: item.sentence,
                    paper_location: item.paper_location,
                    paper_title: item.paper_title,
                    doi: item.doi,
                    ontology_id: item.ontology_id,
                    ontology_label: item.ontology_label,
                    judge_score: item.judge_score,
                    contributed_by: current_loggedin_user,
                    changed_by: [current_loggedin_user]
                }));

                // Group by entity type
                transformedItems.forEach(item => {
                    if (!acc[item.entity]) {
                        acc[item.entityType] = [];
                    }
                    acc[item.entityType].push(item);
                });

                return acc;
            }, {} as Record<string, any[]>)
        };

        console.log("logged in user: "+ current_loggedin_user);

        // Add document metadata
        transformedData.documentName = file.name;
        transformedData.processedAt = new Date().toISOString();
        // transformedData.corrected = !!correctionsStr;

        console.log('Processing complete, returning response');
        return NextResponse.json(transformedData);

    } catch (error) {
        console.error('Error in document processing:', error);
        return NextResponse.json(
            {error: 'Failed to process document'},
            {status: 500}
        );
    }
}
