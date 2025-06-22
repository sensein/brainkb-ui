import { NextRequest, NextResponse } from 'next/server';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAuthToken(): Promise<string> {
  const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
  const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT;

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
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const namedGraphIri = formData.get('named_graph_iri') as string;
    const host = formData.get('host') as string;
    const endpoint = formData.get('endpoint') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!namedGraphIri) {
      return NextResponse.json(
        { error: 'No named graph IRI provided' },
        { status: 400 }
      );
    }

    if (!host || !endpoint) {
      return NextResponse.json(
        { error: 'Host or endpoint not provided' },
        { status: 400 }
      );
    }

    // Validate file type
    for (const file of files) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        return NextResponse.json(
          { error: 'Invalid file type. Only .json files are allowed.' },
          { status: 400 }
        );
      }
    }

    // Create FormData for the query service
    const queryServiceFormData = new FormData();
    
    for (const file of files) {
        queryServiceFormData.append('files', file);
    }
    
    queryServiceFormData.append('named_graph_iri', namedGraphIri);

    const queryServiceUrl = endpoint.startsWith('/') ? `${host}${endpoint}` : `${host}/${endpoint}`;

    // Get authentication token
    let authHeaders: Record<string, string> = {};

    try {
      const token = await getAuthToken();
      authHeaders['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('Failed to get bearer token, proceeding without authentication');
    }

    // Forward the request to the query service
    const response = await fetch(queryServiceUrl, {
      method: 'POST',
      headers: authHeaders,
      body: queryServiceFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Query service error:', errorData);
      return NextResponse.json(
        { error: 'Failed to upload file to query service' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: result
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 