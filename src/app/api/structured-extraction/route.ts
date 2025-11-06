import { NextRequest, NextResponse } from 'next/server';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAuthToken(): Promise<string> {
  const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
  const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;

  if (!jwtUser || !jwtPassword || !tokenEndpoint) {
    throw new Error('JWT credentials not configured');
  }

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: jwtUser,
        password: jwtPassword
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData: TokenResponse = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Failed to get JWT token:', error);
    throw new Error('Authentication failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
    const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
    const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;

    console.log('Environment check:', {
      hasJwtUser: !!jwtUser,
      hasJwtPassword: !!jwtPassword,
      hasTokenEndpoint: !!tokenEndpoint,
      tokenEndpoint
    });

    const formData = await request.formData();
    const inputType = formData.get('input_type') as string;
    const endpoint = formData.get('endpoint') as string;

    console.log('Received request:', { inputType, endpoint });

    if (!inputType) {
      console.log('Error: Input type not provided');
      return NextResponse.json(
        { error: 'Input type not provided' },
        { status: 400 }
      );
    }

    if (!endpoint) {
      console.log('Error: Endpoint not provided');
      return NextResponse.json(
        { error: 'Endpoint not provided. Please check NEXT_PUBLIC_API_ADMIN_EXTRACT_STRUCTURED_RESOURCE_ENDPOINT environment variable.' },
        { status: 400 }
      );
    }

    // Validate endpoint URL
    try {
      new URL(endpoint);
    } catch (error) {
      console.log('Error: Invalid endpoint URL:', endpoint);
      return NextResponse.json(
        { error: 'Invalid endpoint URL provided' },
        { status: 400 }
      );
    }

    // Get authentication token
    let authHeaders: Record<string, string> = {};

    try {
      const token = await getAuthToken();
      authHeaders['Authorization'] = `Bearer ${token}`;
      console.log('Authentication successful');
    } catch (error) {
      console.warn('Failed to get bearer token, proceeding without authentication:', error);
    }

    // Prepare the request body based on input type
    let requestBody: FormData;
    let contentType = 'multipart/form-data';

    // Always use FormData since the backend expects form fields
    requestBody = new FormData();
    
    // Always include input_type as it's required by the backend
    requestBody.append('input_type', inputType);

    if (inputType === 'doi') {
      const doi = formData.get('doi') as string;
      requestBody.append('doi', doi);
      console.log('Processing DOI:', doi);
    } else if (inputType === 'text') {
      const textContent = formData.get('text_content') as string;
      requestBody.append('text_content', textContent);
      console.log('Processing text content, length:', textContent?.length);
    } else if (inputType === 'pdf') {
      const pdfFile = formData.get('pdf_file') as File;
      if (!pdfFile) {
        console.log('Error: PDF file not provided');
        return NextResponse.json(
          { error: 'PDF file not provided' },
          { status: 400 }
        );
      }
      
      console.log('Processing PDF file:', pdfFile.name, 'size:', pdfFile.size);
      requestBody.append('pdf_file', pdfFile);
    } else if (inputType === 'file') {
      const jsonFile = formData.get('json_text_file') as File;
      if (!jsonFile) {
        console.log('Error: JSON file not provided');
        return NextResponse.json(
          { error: 'JSON file not provided' },
          { status: 400 }
        );
      }
      
      console.log('Processing JSON file:', jsonFile.name, 'size:', jsonFile.size);
      // Backend expects 'json_file' but frontend sends 'json_text_file'
      // Also, backend expects input_type to be 'json' for JSON files, not 'file'
      requestBody.set('input_type', 'json');
      requestBody.append('json_file', jsonFile);
    }

    // Set appropriate headers (don't set Content-Type for FormData, let browser set it with boundary)
    const headers: Record<string, string> = {
      ...authHeaders
    };

    console.log('Making request to endpoint:', endpoint);
    console.log('Request headers:', headers);
    console.log('Content type:', contentType);
    console.log('Request body type:', typeof requestBody);

    // Forward the request to the extraction service
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: requestBody,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Extraction service error:', errorData);
      console.error('Response status:', response.status);
      return NextResponse.json(
        { error: 'Failed to process data with extraction service', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Data processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing data:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
