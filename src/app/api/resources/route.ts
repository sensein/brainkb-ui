import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import { fetchPaginatedData, searchById, FetchOptions } from '../utils/api-client';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Search for a specific resource by ID
async function searchResourceById(id: string): Promise<any> {
    // Check for pre-warmed cache first
    const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`resource-entity-${id}`);
    
    if (warmedCache && warmedCache.data) {
        console.info(`[Resources API] Using pre-warmed cache for resource ID: ${id}`);
        return warmedCache.data;
    }

    const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
    if (!endpoint) {
        throw new Error('NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable is not set');
    }

    return await searchById(endpoint, id);
}

// Cached version of search by ID
function getCachedResourceById(id: string) {
    return unstable_cache(
        async () => searchResourceById(id),
        [`resource-entity-${id}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`resource-entity-${id}`]
        }
    );
}

// Cached version of resource data fetch
function getCachedResourceData(limit: string, skip: string) {
    return unstable_cache(
        async () => {
            const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
            if (!endpoint) {
                throw new Error('NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable is not set');
            }

            return await fetchPaginatedData({ endpoint, limit, skip });
        },
        [`resource-data-${limit}-${skip}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`resource-list-${limit}-${skip}`]
        }
    );
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const limit = searchParams.get('limit') || '50';
        const skip = searchParams.get('skip') || '0';

        const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable is not set'
                },
                { status: 500 }
            );
        }

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

                // Use cached search function
                const cachedSearch = getCachedResourceById(id);
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
        const cachedFetch = getCachedResourceData(limit, skip);
        const result = await cachedFetch();

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

