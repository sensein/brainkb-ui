import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createHash } from 'crypto';
import { getData } from '@/src/app/components/getData';
import { getWarmedCache } from '@/src/app/utils/cache-warm';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

// Helper to get query hash
function getQueryHash(sparqlQuery: string): string {
    return createHash('sha256').update(sparqlQuery).digest('hex').slice(0, 16);
}

async function fetchEntityQueryData(sparqlQuery: string) {
    // Check for pre-warmed cache from build time first (only for sample entities)
    const queryHash = getQueryHash(sparqlQuery);
    const warmedCache = getWarmedCache<{ data: any[]; timestamp?: number }>(`entity-query-${queryHash}`);
    
    if (warmedCache) {
        // Extract data from cache (cache file has {data, timestamp} structure)
        const warmedData = warmedCache.data !== undefined ? warmedCache.data : (Array.isArray(warmedCache) ? warmedCache : []);
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
            const itemCount = Array.isArray(warmedData) ? warmedData.length : 0;
            console.log(`Using pre-warmed entity query cache for hash: ${queryHash} (${itemCount} items)`);
        }
        
        // Validate warmed data - if empty, fetch fresh
        if (Array.isArray(warmedData) && warmedData.length > 0) {
            return warmedData;
        } else {
            // Warm cache has empty data, fetch fresh
            if (process.env.NODE_ENV === 'development') {
                console.log(`Warm cache for entity query ${queryHash} is empty, fetching fresh data`);
            }
        }
    }
    
    // If no warmed cache or warm cache is empty, fetch fresh data
    try {
        const queryParameter = { sparql_query: sparqlQuery };
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
        
        const response = await getData(queryParameter, endpoint);
        
        if (response.status === "success" && response.message?.results?.bindings) {
            const bindings = response.message.results.bindings;
            if (process.env.NODE_ENV === 'development') {
                console.log(`Fetched fresh entity query data: ${Array.isArray(bindings) ? bindings.length : 0} items`);
            }
            return Array.isArray(bindings) ? bindings : [];
        }
        
        // If API returns invalid format, return empty array instead of throwing
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Invalid response format for entity query, returning empty array`);
        }
        return [];
    } catch (error) {
        console.error('Error fetching entity query data:', error);
        // Don't throw - return empty array so page can display gracefully
        // This ensures we never show an error when cache fails, just fetch fresh
        return [];
    }
}

// Create a cached version based on query hash
function getCachedEntityQuery(sparqlQuery: string) {
    // Create a hash of the query for cache key
    const queryHash = getQueryHash(sparqlQuery);
    
    return unstable_cache(
        async () => fetchEntityQueryData(sparqlQuery),
        [`brainkb-entity-query-${queryHash}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`entity-query-${queryHash}`]
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sparql_query } = body;
        
        if (!sparql_query || typeof sparql_query !== 'string') {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'sparql_query is required and must be a string' 
                },
                { status: 400 }
            );
        }
        
        const cachedFetch = getCachedEntityQuery(sparql_query);
        const result = await cachedFetch();
        
        return NextResponse.json({ 
            success: true, 
            data: result 
        });
    } catch (error: any) {
        console.error('Error in entity-query API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to fetch entity query data' 
            },
            { status: 500 }
        );
    }
}

