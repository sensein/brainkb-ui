import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getWarmedCache } from '@/src/app/utils/cache-warm';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// Cache token for 1 hour (tokens typically expire in 1 hour)
const TOKEN_CACHE_DURATION = 60 * 60; // 1 hour in seconds

async function fetchAuthToken(): Promise<string> {
    const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
    const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
    const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;

    if (!tokenEndpoint || !jwtUser || !jwtPassword) {
        throw new Error('JWT authentication credentials not configured');
    }

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: jwtUser,
                password: jwtPassword,
            }),
            // Don't cache the token fetch itself
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Token request failed: ${response.status}`);
        }

        const tokenData: TokenResponse = await response.json();
        return tokenData.access_token;
    } catch (error) {
        console.error('[NER API] Failed to get JWT token:', error);
        throw new Error('Authentication failed');
    }
}

// Cached version of getAuthToken
const getCachedAuthToken = unstable_cache(
    async () => fetchAuthToken(),
    ['ner-auth-token'],
    {
        revalidate: TOKEN_CACHE_DURATION,
        tags: ['ner-auth-token']
    }
);

async function getAuthToken(): Promise<string> {
    try {
        return await getCachedAuthToken();
    } catch (error) {
        console.error('[NER API] Failed to get cached auth token:', error);
        // Fallback to direct fetch if cache fails
        return fetchAuthToken();
    }
}

async function withAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const useBearerToken = process.env.NEXT_PUBLIC_USE_BEARER_TOKEN !== 'false';
    
    if (useBearerToken) {
        try {
            const token = await getAuthToken();
            headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.warn('[NER API] Failed to get bearer token, proceeding without authentication');
            // Don't throw - allow requests without auth if token fails
        }
    }

    return headers;
}

// Fetch NER data from external API
async function fetchNERData(endpoint: string, limit: string, skip: string, headers: Record<string, string>) {
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        const baseUrl = process.env.NEXT_PUBLIC_API_ADMIN_HOST || 'https://queryservice.brainkb.org';
        url = new URL(endpoint, baseUrl);
    }

    url.searchParams.set('limit', limit);
    url.searchParams.set('skip', skip);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        // Cache the fetch for runtime caching
        next: { revalidate: CACHE_DURATION }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
}

// Cached version of NER data fetch
function getCachedNERData(limit: string, skip: string) {
    return unstable_cache(
        async () => {
            const endpoint = process.env.NEXT_PUBLIC_NER_GET_ENDPOINT;
            if (!endpoint) {
                throw new Error('NEXT_PUBLIC_NER_GET_ENDPOINT environment variable is not set');
            }

            const headers = await withAuthHeaders();
            return await fetchNERData(endpoint, limit, skip, headers);
        },
        [`ner-data-${limit}-${skip}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`ner-list-${limit}-${skip}`]
        }
    );
}

// Search for a specific NER entity by ID
async function searchNERById(id: string): Promise<any> {
    // Check for pre-warmed cache first
    const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`ner-entity-${id}`);
    
    if (warmedCache && warmedCache.data) {
        console.info(`[NER API] Using pre-warmed cache for entity ID: ${id}`);
        return warmedCache.data;
    }

    const endpoint = process.env.NEXT_PUBLIC_NER_GET_ENDPOINT;
    if (!endpoint) {
        throw new Error('NEXT_PUBLIC_NER_GET_ENDPOINT environment variable is not set');
    }

    // Search through multiple pages to find the item
    const headers = await withAuthHeaders();
    let currentSkip = 0;
    const searchLimit = 100; // Search in batches of 100
    const maxSearchPages = 50; // Limit search to 50 pages (5000 items)
    
    for (let page = 0; page < maxSearchPages; page++) {
        let url: URL;
        try {
            url = new URL(endpoint);
        } catch {
            const baseUrl = process.env.NEXT_PUBLIC_API_ADMIN_HOST || 'https://queryservice.brainkb.org';
            url = new URL(endpoint, baseUrl);
        }

        url.searchParams.set('limit', String(searchLimit));
        url.searchParams.set('skip', String(currentSkip));

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers,
            next: { revalidate: CACHE_DURATION }
        });

        if (!response.ok) {
            break;
        }

        const result = await response.json();
        if (Array.isArray(result.data)) {
            const foundItem = result.data.find((item: any) => item._id === id);
            if (foundItem) {
                return foundItem;
            }
            
            // If no more data or reached the end
            if (!result.has_more || result.data.length === 0) {
                break;
            }
            
            currentSkip += searchLimit;
        } else {
            break;
        }
    }

    throw new Error('NER entity not found');
}

// Cached version of search by ID
function getCachedNERById(id: string) {
    return unstable_cache(
        async () => searchNERById(id),
        [`ner-entity-${id}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`ner-entity-${id}`]
        }
    );
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const limit = searchParams.get('limit') || '50';
        const skip = searchParams.get('skip') || '0';

        const endpoint = process.env.NEXT_PUBLIC_NER_GET_ENDPOINT;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_NER_GET_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

        // If ID is provided, search for that specific item
        if (id) {
            try {
                // Check for pre-warmed cache first
                const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`ner-entity-${id}`);
                
                if (warmedCache && warmedCache.data) {
                    console.info(`[NER API] Using pre-warmed cache for entity ID: ${id}`);
                    return NextResponse.json({
                        success: true,
                        data: warmedCache.data,
                    });
                }

                // Use cached search function
                const cachedSearch = getCachedNERById(id);
                const foundItem = await cachedSearch();

                return NextResponse.json({
                    success: true,
                    data: foundItem,
                });
            } catch (error: any) {
                if (error.message === 'NER entity not found') {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'NER entity not found'
                        },
                        { status: 404 }
                    );
                }
                throw error;
            }
        }

        // List view - check for pre-warmed cache
        const cacheKey = `ner-list-${limit}-${skip}`;
        const warmedCache = getWarmedCache<{
            data: any[];
            total?: number;
            limit?: number;
            skip?: number;
            has_more?: boolean;
            timestamp?: number;
        }>(cacheKey);

        if (warmedCache && Array.isArray(warmedCache.data)) {
            console.info(`[NER API] Using pre-warmed cache for list (limit: ${limit}, skip: ${skip})`);
            return NextResponse.json({
                success: true,
                data: warmedCache.data,
                total: warmedCache.total || 0,
                limit: warmedCache.limit || parseInt(limit),
                skip: warmedCache.skip || parseInt(skip),
                has_more: warmedCache.has_more || false,
            });
        }

        // Use cached fetch function
        const cachedFetch = getCachedNERData(limit, skip);
        const result = await cachedFetch();

        console.info('[NER API] Response received');
        console.info('[NER API] Data type:', Array.isArray(result.data) ? 'array' : typeof result.data);
        console.info('[NER API] Data length:', Array.isArray(result.data) ? result.data.length : 'N/A');

        return NextResponse.json({
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            total: result.total || 0,
            limit: result.limit || parseInt(limit),
            skip: result.skip || parseInt(skip),
            has_more: result.has_more || false,
        });
    } catch (error: any) {
        console.error('[NER API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch NER data'
            },
            { status: 500 }
        );
    }
}

