import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import { fetchPaginatedData, searchById } from '../utils/api-client';

const CACHE_DURATION = 4 * 60 * 60; // 4 hours in seconds

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

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

    return await searchById(endpoint, id);
}

// Cached version of search by ID
function getCachedNERById(id: string) {
    return unstable_cache(
        async () => searchNERById(id),
        [`ner-entity-${id}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`ner-entity-${id}`, 'ner-all', 'ner-entities']
        }
    );
}

// Cached version of NER data fetch
function getCachedNERData(limit: string, skip: string, search?: string) {
    return unstable_cache(
        async () => {
            const endpoint = process.env.NEXT_PUBLIC_NER_GET_ENDPOINT;
            if (!endpoint) {
                throw new Error('NEXT_PUBLIC_NER_GET_ENDPOINT environment variable is not set');
            }

            return await fetchPaginatedData({ endpoint, limit, skip, search });
        },
        [`ner-data-${limit}-${skip}-${search || ''}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`ner-list-${limit}-${skip}-${search || ''}`, 'ner-all', 'ner-lists']
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
        // First try exact match, then try warm cache with limit 500 (build-time cache)
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
                console.info(`[NER API] Using pre-warmed cache (500 items) sliced to limit: ${limit}, skip: ${skip}`);
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
        const cachedFetch = getCachedNERData(limit, skip, search);
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

