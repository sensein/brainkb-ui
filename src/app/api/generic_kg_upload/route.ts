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

    // Validate endpoint URL
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    let queryServiceUrl: string;
    try {
      // Build URL with query parameters
      const url = new URL(endpoint);
      url.searchParams.set('user_id', userId);
      if (namedGraphIri) {
        url.searchParams.set('named_graph_iri', namedGraphIri);
      }
      url.searchParams.set('max_concurrency', '8');
      queryServiceUrl = url.toString();
    } catch (error) {
      const err = error as Error;
      console.error('[generic_kg_upload] Invalid endpoint URL:', endpoint, err);
      return NextResponse.json(
        { error: `Invalid endpoint URL: ${err.message}` },
        { status: 400 }
      );
    }

    // Read all file contents and convert to Buffers for Node.js FormData
    const fileBuffers: { name: string; buffer: Buffer; type: string }[] = [];
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fileBuffers.push({
          name: file.name,
          buffer: buffer,
          type: file.type || 'application/octet-stream'
        });
      } catch (error) {
        const err = error as Error;
        console.error(`[generic_kg_upload] Failed to read file ${file.name}:`, err);
        return NextResponse.json(
          { error: `Failed to read file ${file.name}: ${err.message}` },
          { status: 400 }
        );
      }
    }

    // Use form-data package for Node.js compatibility
    const FormDataNode = (await import('form-data')).default;
    const queryServiceFormData = new FormDataNode();
    
    // Add each file as a separate file field
    for (const fileData of fileBuffers) {
      queryServiceFormData.append('files', fileData.buffer, {
        filename: fileData.name,
        contentType: fileData.type
      });
    }
    
    queryServiceFormData.append('named_graph_iri', namedGraphIri);
    queryServiceFormData.append('file_type', fileType);



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
        // Continue without auth - let the backend decide if it's required
      }
    }

    // Get FormData headers (includes Content-Type with boundary)
    const formHeaders = queryServiceFormData.getHeaders();
    
    // Merge headers (FormData headers + Authorization)
    const allHeaders = {
      ...formHeaders,
      ...headers
    };

    // Forward the request to the query service using undici for better Node.js FormData support
    // Note: This works in both local development and Docker environments:
    // - Local: Can use localhost:8010 or 127.0.0.1:8010
    // - Docker: Can use Docker service names (e.g., brainkb-unified:8010) if on same network
    // - The endpoint URL comes from NEXT_PUBLIC_API_ADMIN_INSERT_KGS_JSONLD_TTL_ENDPOINT env var
    const { Client } = await import('undici');
    const url = new URL(queryServiceUrl);
    const origin = url.origin;
    const path = url.pathname + url.search;

    const client = new Client(origin, {
      headersTimeout: 3600000 // 1 hour timeout for large file uploads
    });

    try {
      const { statusCode, body } = await client.request({
        path: path,
        method: 'POST',
        headers: allHeaders,
        body: queryServiceFormData,
        signal: AbortSignal.timeout(3600000) // 1 hour timeout
      });

      // Convert undici response to fetch-like response
      let responseData = '';
      for await (const chunk of body) {
        responseData += chunk;
      }

      const response = {
        ok: statusCode >= 200 && statusCode < 300,
        status: statusCode,
        async json() {
          return JSON.parse(responseData);
        },
        async text() {
          return responseData;
        }
      };

      client.close();

      if (!response.ok) {
        const errorData = await response.text();
        
        let errorMessage = 'Failed to upload file to query service';
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            status: response.status,
            details: process.env.NODE_ENV === 'development' ? errorData : undefined
          },
          { status: response.status }
        );
      }

      const result = await response.json();

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (clientError) {
      client.close();
      throw clientError;
    }

  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
} 