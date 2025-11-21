import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../../config/env';
import { TokenResponse } from '../../../types/api';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

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

async function fetchTaxonomyData() {
    // Taxonomy tree is NOT cached - it's fetched fresh each time
    // Individual taxonomy node queries (when users click) are cached via entity-query API
    try {
        const queryServiceUrl = env.taxonomyEndpoint;
        
        if (!queryServiceUrl || queryServiceUrl.trim() === '') {
            // If URL is not configured, return null (will be handled by the GET handler)
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
                console.warn('Query service URL not configured for taxonomy');
            }
            return null;
        }

        let authHeaders: Record<string, string> = {};

        try {
            const token = await getAuthToken();
            authHeaders['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.warn('Failed to get bearer token, proceeding without authentication');
        }

        // Forward the request to the query service
        const response = await fetch(queryServiceUrl, {
            method: 'GET',
            headers: authHeaders,
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Query service error:', errorData);
            throw new Error(`Failed to fetch taxonomy data: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Unable to get taxonomy:', error);
        throw error;
    }
}

// No caching for taxonomy tree - fetch fresh each time
// Individual node queries are cached when users click via entity-query API

export async function GET(request: NextRequest) {
    try {
        // Fetch fresh data (no caching for taxonomy tree)
        const data = await fetchTaxonomyData();
        
        // If data is null (e.g., during build with missing config), return appropriate response
        if (data === null) {
            return NextResponse.json({
                success: false,
                error: 'Query service URL not configured'
            }, { status: 503 });
        }
        
        return NextResponse.json({
            success: true,
            message: 'Taxonomy successfully retrieved',
            data: data
        });
    } catch (error: any) {
        console.error('Error in HMBA taxonomy API:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Internal server error' 
            },
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