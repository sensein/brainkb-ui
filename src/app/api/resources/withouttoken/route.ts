import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import { fetchPaginatedDataWithoutToken, searchByIdWithoutToken } from '../../utils/api-client-without-token';

const CACHE_DURATION = 4 * 60 * 60; // 4 hours in seconds

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Search for a specific resource by ID (without token)
async function searchResourceByIdWithoutToken(id: string, endpoint: string): Promise<any> {
    // Check for pre-warmed cache first
    const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`resource-entity-${id}`);
    
    if (warmedCache && warmedCache.data) {
        console.info(`[Resources API WithoutToken] Using pre-warmed cache for resource ID: ${id}`);
        return warmedCache.data;
    }

    if (!endpoint) {
        throw new Error('Endpoint is required');
    }

    return await searchByIdWithoutToken(endpoint, id);
}

// Cached version of search by ID
function getCachedResourceByIdWithoutToken(id: string, endpoint: string) {
    return unstable_cache(
        async () => searchResourceByIdWithoutToken(id, endpoint),
        [`resource-entity-${id}-notoken`],
        {
            revalidate: CACHE_DURATION,
            tags: [`resource-entity-${id}`, 'resource-all', 'resource-entities']
        }
    );
}

// Cached version of resource data fetch
function getCachedResourceDataWithoutToken(endpoint: string, limit: string, skip: string, search?: string) {
    return unstable_cache(
        async () => {
            if (!endpoint) {
                throw new Error('Endpoint is required');
            }

            return await fetchPaginatedDataWithoutToken({ endpoint, limit, skip, search });
        },
        [`resource-data-${limit}-${skip}-${search || ''}-notoken`],
        {
            revalidate: CACHE_DURATION,
            tags: [`resource-list-${limit}-${skip}-${search || ''}`, 'resource-all', 'resource-lists']
        }
    );
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const limit = searchParams.get('limit') || '50';
        const skip = searchParams.get('skip') || '0';
        const search = searchParams.get('search') || undefined;
        const endpoint = searchParams.get('endpoint');

        if (!endpoint) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Endpoint parameter is required'
                },
                { status: 400 }
            );
        }

        // If ID is provided, search for that specific item
        if (id) {
            try {
                // Check for pre-warmed cache first
                const warmedCache = getWarmedCache<{ data: any; timestamp?: number }>(`resource-entity-${id}`);
                
                if (warmedCache && warmedCache.data) {
                    console.info(`[Resources API WithoutToken] Using pre-warmed cache for resource ID: ${id}`);
                    return NextResponse.json({
                        success: true,
                        data: warmedCache.data,
                    });
                }

                // Use cached search function
                const cachedSearch = getCachedResourceByIdWithoutToken(id, endpoint);
                const foundItem = await cachedSearch();

                return NextResponse.json({
                    success: true,
                    data: foundItem,
                });
            } catch (error: any) {
                if (error.message === 'Entity not found' || error.message === 'Resource not found') {
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
                console.info(`[Resources API WithoutToken] Using pre-warmed cache (500 items) sliced to limit: ${limit}, skip: ${skip}`);
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
            console.info(`[Resources API WithoutToken] Using pre-warmed cache for list (limit: ${limit}, skip: ${skip})`);
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
        const cachedFetch = getCachedResourceDataWithoutToken(endpoint, limit, skip, search);
        const result = await cachedFetch();

        console.info('[Resources API WithoutToken] Response received');
        console.info('[Resources API WithoutToken] Data type:', Array.isArray(result.data) ? 'array' : typeof result.data);
        console.info('[Resources API WithoutToken] Data length:', Array.isArray(result.data) ? result.data.length : 'N/A');

        return NextResponse.json({
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            total: result.total || 0,
            limit: result.limit || parseInt(limit),
            skip: result.skip || parseInt(skip),
            has_more: result.has_more || false,
        });
    } catch (error: any) {
        console.error('[Resources API WithoutToken] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch resource data'
            },
            { status: 500 }
        );
    }
}

