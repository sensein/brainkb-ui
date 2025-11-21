import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../../config/env';
import { TokenResponse } from '../../../types/api';

async function getAuthToken(): Promise<string> {
  const jwtUser = env.jwtUser;
  const jwtPassword = env.jwtPassword;
  const tokenEndpoint = env.tokenEndpointQueryService;

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
    const fileType = formData.get('file_type') as string;
    const endpoint = formData.get('endpoint') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!namedGraphIri) {
      return NextResponse.json(
        { error: 'No named graph provided' },
        { status: 400 }
      );
    }

    if (!fileType || !['ttl', 'jsonld'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be ttl or jsonld.' },
        { status: 400 }
      );
    }



    // Validate file type
    const allowedTypes = ['application/ld+json', 'text/turtle', 'application/octet-stream'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.jsonld') && !file.name.endsWith('.ttl')) {
        return NextResponse.json(
          { error: 'Invalid file type. Only .jsonld and .ttl files are allowed.' },
          { status: 400 }
        );
      }
    }

    // Read all file contents
    const fileContents: string[] = [];
    for (const file of files) {
      const content = await file.text();
      fileContents.push(content);
    }

    // Create FormData for the query service
    const queryServiceFormData = new FormData();
    
    // Add each file as a separate file field
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = fileContents[i];
      
      // Create a new file object with the content
      const fileBlob = new Blob([content], { type: file.type || 'application/octet-stream' });
      const newFile = new File([fileBlob], file.name, { type: file.type || 'application/octet-stream' });
      
      queryServiceFormData.append('files', newFile);
    }
    
    queryServiceFormData.append('named_graph_iri', namedGraphIri);
    queryServiceFormData.append('file_type', fileType);

    console.log('Sending FormData to query service with files:', files.map(f => f.name));
    console.log('Named graph IRI:', namedGraphIri);
    console.log('File type:', fileType);

    const queryServiceUrl = endpoint;

    // Get authentication token
    let authHeaders: Record<string, string> = {};

    try {
      const token = await getAuthToken();
      authHeaders['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('Failed to get bearer token, proceeding without authentication');
    }

    console.log('Making request to:', queryServiceUrl);
    console.log('Headers:', authHeaders);

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