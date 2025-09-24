import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { on } from 'events';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }

async function getAuthToken(): Promise<string> {
    const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
    const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
    const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_QUERY_SERVICE;
  
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

export async function GET(request: NextRequest) {
    // Get authentication token
    try {
        const queryServiceUrl = process.env.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT;
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
        method: 'GET',
        headers: authHeaders,
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
        console.log('Received taxonomy data:', result);
        return NextResponse.json({
            success: true,
            message: 'Taxonomy successfully retrieved',
            data: result
          });
      
    } catch (error) {
        console.error('Unable to get taxonomy:', error);
        return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
        );
    }

//   try {
//     // Construct the path to the treeData.json file in the public directory
//     const filePath = path.join(process.cwd(), 'public', 'treeData.json');
    
//     // Read the JSON file
//     const fileContent = await fs.readFile(filePath, 'utf8');
    
//     // Parse the JSON content
//     const treeData = JSON.parse(fileContent);
    
//     // Return the data as JSON response
//     return NextResponse.json(treeData);
    
//   } catch (error) {
//     console.error('Error reading tree data file:', error);
//     return NextResponse.json(
//       { error: 'Failed to load tree data' },
//       { status: 500 }
//     );
//   }
}