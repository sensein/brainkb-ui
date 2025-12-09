import { NextRequest, NextResponse } from 'next/server';
import { getWarmedCache } from '@/src/utils/cache/cache-warm';
import { fetchPaginatedData, searchById } from '@/src/utils/api/api-client';
import { CacheService } from '@/src/services/cache/cache-service';
import { CACHE_DURATIONS } from '@/src/config/constants';
import { env } from '@/src/config/env';

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Search for a specific resource by ID
async function searchResourceById(
    id: string, 
    endpoint?: string,
    tokenEndpointType: 'ml' | 'query' | 'default' = 'query'
): Promise<any> {
    // Check for pre-warmed cache first
    const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`resource-entity-${id}`);
    
    if (warmedCache && warmedCache.data) {
        console.info(`[Resources API] Using pre-warmed cache for resource ID: ${id}`);
        return warmedCache.data;
    }

    const finalEndpoint = endpoint || env.resourceEndpoint;
    if (!finalEndpoint) {
        throw new Error('Endpoint is required. Provide it as a parameter or set NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable');
    }

    console.log('[Resources API] Searching by ID with tokenEndpointType:', tokenEndpointType, 'endpoint:', finalEndpoint);
    return await searchById(finalEndpoint, id, undefined, true, tokenEndpointType);
}

// Cached version of search by ID
function getCachedResourceById(
    id: string, 
    endpoint?: string,
    tokenEndpointType: 'ml' | 'query' | 'default' = 'query'
) {
    return CacheService.createCache(
        async () => searchResourceById(id, endpoint, tokenEndpointType),
        `resource-entity-${id}-${tokenEndpointType}-${endpoint || 'default'}`,
        [`resource-entity-${id}`, 'resource-all', 'resource-entities'],
        CACHE_DURATIONS.MEDIUM
    );
}

// Cached version of resource data fetch (same pattern as NER route)
function getCachedResourceData(
    endpoint: string, 
    limit: string, 
    skip: string, 
    search?: string,
    tokenEndpointType: 'ml' | 'query' | 'default' = 'query'
) {
    return CacheService.createCache(
        async () => {
            if (!endpoint) {
                throw new Error('Endpoint is required');
            }

            console.log('[Resources API] Calling backend with tokenEndpointType:', tokenEndpointType);
            return await fetchPaginatedData({ endpoint, limit, skip, search }, true, tokenEndpointType);
        },
        `resource-data-${limit}-${skip}-${search || ''}-${endpoint}-${tokenEndpointType}`,
        [`resource-list-${limit}-${skip}-${search || ''}`, 'resource-all', 'resource-lists'],
        CACHE_DURATIONS.MEDIUM
    );
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const limit = searchParams.get('limit') || '50';
        const skip = searchParams.get('skip') || '0';
        const search = searchParams.get('search') || undefined;
        
        // Accept endpoint from query params (for dynamic config) or fall back to env var
        const endpoint = searchParams.get('endpoint') || env.resourceEndpoint;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Endpoint is required. Provide it as a query parameter or set NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable'
                },
                { status: 500 }
            );
        }
        
        // Accept tokenEndpointType from query params (passed from DynamicListPage/DynamicDetailPage) or default to 'query'
        const tokenEndpointType = (searchParams.get('tokenEndpointType') as 'ml' | 'query' | 'default') || 'query';
        console.log('[Resources API] Received tokenEndpointType:', tokenEndpointType);

        // If ID is provided, search for that specific item
        if (id) {
            try {
                // Check for pre-warmed cache first
                const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`resource-entity-${id}`);
                
                if (warmedCache && warmedCache.data) {
                    console.info(`[Resources API] Using pre-warmed cache for resource ID: ${id}`);
                    return NextResponse.json({
                        success: true,
                        data: warmedCache.data,
                    });
                }

                // Use cached search function with tokenEndpointType
                const cachedSearch = getCachedResourceById(id, endpoint, tokenEndpointType);
                const foundItem = await cachedSearch();

                return NextResponse.json({
                    success: true,
                    data: foundItem,
                });
            } catch (error: any) {
                if (error.message === 'Entity not found') {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Resource not found'
                        },
                        { status: 404 }
                    );
                }
                throw error;
            }
        }

        // List view - check for pre-warmed cache
        // First try exact match, then try warm cache with limit 500 (build-time cache)
        const cacheKey = `resource-list-${limit}-${skip}`;
        let warmedCache = getWarmedCache<{
            data: any[];
            total?: number;
            limit?: number;
            skip?: number;
            has_more?: boolean;
            timestamp?: number;
        }>(cacheKey);

        // If exact match not found and skip is 0, try warm cache with limit 500
        if (!warmedCache && skip === '0') {
            const warmCacheKey = `resource-list-500-0`;
            warmedCache = getWarmedCache<{
                data: any[];
                total?: number;
                limit?: number;
                skip?: number;
                has_more?: boolean;
                timestamp?: number;
            }>(warmCacheKey);
            
            // If we have warm cache with 500 items, slice it to match requested limit
            if (warmedCache && Array.isArray(warmedCache.data)) {
                const requestedLimit = parseInt(limit);
                const slicedData = warmedCache.data.slice(0, requestedLimit);
                console.info(`[Resources API] Using pre-warmed cache (500 items) sliced to limit: ${limit}, skip: ${skip}`);
                return NextResponse.json({
                    success: true,
                    data: slicedData,
                    total: warmedCache.total || 0,
                    limit: requestedLimit,
                    skip: parseInt(skip),
                    has_more: warmedCache.data.length > requestedLimit || (warmedCache.has_more || false),
                });
            }
        }

        if (warmedCache && Array.isArray(warmedCache.data)) {
            console.info(`[Resources API] Using pre-warmed cache for list (limit: ${limit}, skip: ${skip})`);
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
        const cachedFetch = getCachedResourceData(endpoint, limit, skip, search, tokenEndpointType);
        const result = await cachedFetch() as {
          data?: unknown[];
          total?: number;
          limit?: number;
          skip?: number;
          has_more?: boolean;
        };

        console.info('[Resources API] Response received');
        console.info('[Resources API] Data type:', Array.isArray(result.data) ? 'array' : typeof result.data);
        console.info('[Resources API] Data length:', Array.isArray(result.data) ? result.data.length : 'N/A');

        return NextResponse.json({
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            total: result.total || 0,
            limit: result.limit || parseInt(limit),
            skip: result.skip || parseInt(skip),
            has_more: result.has_more || false,
        });
    } catch (error: any) {
        console.error('[Resources API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch resource data'
            },
            { status: 500 }
        );
    }
}

