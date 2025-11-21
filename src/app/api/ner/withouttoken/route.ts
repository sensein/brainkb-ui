import { NextRequest, NextResponse } from 'next/server';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import { fetchPaginatedDataWithoutToken, searchByIdWithoutToken } from '@/src/utils/api/api-client-without-token';
import { CacheService } from '@/src/services/cache/cache-service';
import { CACHE_DURATIONS } from '@/src/config/constants';

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Search for a specific NER entity by ID (without token)
async function searchNERByIdWithoutToken(id: string, endpoint: string): Promise<any> {
    if (!endpoint) {
        throw new Error('Endpoint is required');
    }

    return await searchByIdWithoutToken(endpoint, id);
}

// Cached version of search by ID
function getCachedNERByIdWithoutToken(id: string, endpoint: string) {
    return CacheService.createCache(
        async () => searchNERByIdWithoutToken(id, endpoint),
        `ner-entity-${id}-notoken`,
        [`ner-entity-${id}`, 'ner-all', 'ner-entities'],
        CACHE_DURATIONS.MEDIUM
    );
}

// Cached version of NER data fetch
function getCachedNERDataWithoutToken(endpoint: string, limit: string, skip: string, search?: string) {
    return CacheService.createCache(
        async () => {
            if (!endpoint) {
                throw new Error('Endpoint is required');
            }

            return await fetchPaginatedDataWithoutToken({ endpoint, limit, skip, search });
        },
        `ner-data-${limit}-${skip}-${search || ''}-notoken`,
        [`ner-list-${limit}-${skip}-${search || ''}`, 'ner-all', 'ner-lists'],
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
                // Use cached search function
                const cachedSearch = getCachedNERByIdWithoutToken(id, endpoint);
                const foundItem = await cachedSearch();

                return NextResponse.json({
                    success: true,
                    data: foundItem,
                });
            } catch (error: any) {
                if (error.message === 'NER entity not found' || error.message === 'Entity not found') {
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
            const warmCacheKey = `ner-list-500-0`;
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
                console.info(`[NER API WithoutToken] Using pre-warmed cache (500 items) sliced to limit: ${limit}, skip: ${skip}`);
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
            console.info(`[NER API WithoutToken] Using pre-warmed cache for list (limit: ${limit}, skip: ${skip})`);
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
        const cachedFetch = getCachedNERDataWithoutToken(endpoint, limit, skip, search);
        const result = await cachedFetch() as {
          data?: unknown[];
          total?: number;
          limit?: number;
          skip?: number;
          has_more?: boolean;
        };

        console.info('[NER API WithoutToken] Response received');
        console.info('[NER API WithoutToken] Data type:', Array.isArray(result.data) ? 'array' : typeof result.data);
        console.info('[NER API WithoutToken] Data length:', Array.isArray(result.data) ? result.data.length : 'N/A');

        return NextResponse.json({
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            total: result.total || 0,
            limit: result.limit || parseInt(limit),
            skip: result.skip || parseInt(skip),
            has_more: result.has_more || false,
        });
    } catch (error: any) {
        console.error('[NER API WithoutToken] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch NER data'
            },
            { status: 500 }
        );
    }
}

