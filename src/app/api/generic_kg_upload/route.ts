import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenForService } from '../../../utils/api/auth';
import { env } from '../../../config/env';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const namedGraphIri = formData.get('named_graph_iri') as string;
    const fileType = formData.get('file_type') as string;
    const endpoint = formData.get('endpoint') as string;
    const userId = formData.get('user_id') as string;

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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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
    console.log('User ID:', userId);

    // Build URL with query parameters
    const url = new URL(endpoint);
    url.searchParams.set('user_id', userId);
    if (namedGraphIri) {
      url.searchParams.set('named_graph_iri', namedGraphIri);
    }
    url.searchParams.set('max_concurrency', 8);
    const queryServiceUrl = url.toString();

    // Get authentication token (without Content-Type header for FormData)
    // FormData needs to set Content-Type automatically with boundary
    const headers: Record<string, string> = {};
    if (env.useBearerToken) {
      try {
        const token = await getAuthTokenForService('query');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[generic_kg_upload] Failed to get auth token:', error);
      }
    }

    console.log('Making request to:', queryServiceUrl);
    console.log('Files count:', files.length);
    console.log('Headers (Authorization only for FormData):', Object.keys(headers));

    // Forward the request to the query service
    // Note: Don't set Content-Type header - fetch will set it automatically with boundary for FormData
    const response = await fetch(queryServiceUrl, {
      method: 'POST',
      headers: headers, // Only Authorization header, no Content-Type
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