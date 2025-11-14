import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

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

async function fetchTaxonomyData() {
    // Taxonomy is cached at runtime when user clicks/navigates (not during build)
    // No warm cache check needed - always fetch and cache at runtime
    try {
        const queryServiceUrl = process.env.NEXT_PUBLIC_API_QUERY_TAXONOMY_ENDPOINT;
        
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

// Create a cached version of the fetch function
const getCachedTaxonomyData = unstable_cache(
    async () => fetchTaxonomyData(),
    ['brainkb-hmba-taxonomy-data'],
    {
        revalidate: CACHE_DURATION,
        tags: ['hmba-taxonomy']
    }
);

export async function GET(request: NextRequest) {
    try {
        const data = await getCachedTaxonomyData();
        
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